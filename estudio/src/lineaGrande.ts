// La línea en grande, para auditar el pasado (pedido pd_linea_zoom; nota de voz del titular nmvtvsjyxtit y sus elecciones del
// 30 de octubre al 2 de noviembre de 2026): la lupa de la barra la abre en una ventana del 90 % de la pantalla, y es la misma
// línea del enfoque, ampliada y con toda su historia: sus ramas y los trazos que se juntan en cada revisión (nota de voz
// nmvzlkkuztit), con la carita del director en cada revisión y en rojo las que no cerraron. Se arrastra y la rueda la mueve en
// el tiempo; no vuelve sola: un botón en la esquina la lleva de regreso al punto de siempre (nmvzo9uaxtit). Pasar sobre una
// revisión dice su fecha y su hora en un globo, sin texto en la línea (nmvzls511tit); un clic abre a la derecha su historial y
// «La conversación» mientras exista su registro. Lo que gastó, en tokens y en la parte aproximada de tu plan, nunca en dinero.

import { informeDeRevision, type RevisionDeLinea } from '../../src/director/historiaLinea';
import type { RevisionEnHistorial } from '../../src/director/lineasDeRevision';
import { caraDentro } from './cara';
import { corridoAl, ESPERA_REGRESO, MARGEN_COMPLETA, svgLineaViva, textoDelInforme, type OpcionesLinea, type Rama } from './lineaViva';
import { lenguaje, t, type ClaveDeTexto } from './textos';
import { enTuPlanTexto } from './vistaGasto';

/** Dónde va tu personaje, como parte del ancho: deja a la vista mucho historial (elegido el 29 de octubre: del 80 al 90 %). */
export const LUGAR_TU = 0.85;
/**
 * Los píxeles por cada unidad del dibujo: la misma línea del enfoque, que va a uno, apenas ampliada, para que quepan varias
 * revisiones a la vez (nota de voz del titular nmvznun6qtit, 2 de noviembre de 2026; antes, 2).
 */
export const ZOOM = 1.25;
/** Lo que ocupan las ramas del alto de la ventana: un 30 % de lo que ocupaban, con el cielo a la vista arriba y abajo (nmvznun6qtit). */
export const PARTE_DEL_ALTO = 0.3;

const n1 = (x: number) => Math.round(x * 10) / 10;
const esc = (x: string) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Lo que tiene al menos un historial que mostrar, o, si no, dice que no lo hay. */
const conHistorial = (r: RevisionEnHistorial): r is Exclude<RevisionEnHistorial, { sinHistorial: true }> => !r.sinHistorial;
/** Se marca en rojo la que se sabe que no cerró; de una sin historial no se sabe, y no se acusa. */
export const noCerro = (r: RevisionEnHistorial): boolean => conHistorial(r) && !r.cerro;

/**
 * Todas las revisiones del proyecto, de la más vieja a la más nueva: las de este computador, con su historial, y las que la
 * historia de la línea (viaja con el proyecto) trae de otro, que salen sin él y lo dicen (pd_linea_zoom). Una de la historia es
 * de este computador si alguna se lanzó entre su corte, con unos minutos de margen, y su cierre. Pura.
 */
export function revisionesEnLinea(historial: RevisionEnHistorial[], historia: RevisionDeLinea[], proyecto = ''): RevisionEnHistorial[] {
  const MARGEN = 10 * 60_000;
  const hora = (x: string) => Date.parse(x);
  const deOtro = historia.filter((h) => {
    const desde = hora(h.corte ?? h.desde) - MARGEN;
    return !historial.some((r) => hora(r.cuando) >= desde && hora(r.cuando) <= hora(h.junto));
  }).map((h): RevisionEnHistorial => ({ registro: '', proyecto, cuando: h.corte ?? h.junto, sinHistorial: true }));
  return [...historial, ...deOtro].filter((r) => Number.isFinite(hora(r.cuando))).sort((a, b) => a.cuando.localeCompare(b.cuando));
}

/**
 * Dónde se marca cada revisión: donde se juntaron sus ramas, si es la que estaba más cerca de ese corte; las demás, como un
 * intento que no cerró, en su momento. De la misma historia de la línea normal, para que la carita caiga en su punto. Pura.
 */
export function lugaresDeRevisiones(revisiones: RevisionEnHistorial[], historia: RevisionDeLinea[]): string[] {
  const suya = historiaDeRevisiones(revisiones, historia);
  return revisiones.map((r, i) => suya[i]?.corte ?? suya[i]?.junto ?? r.cuando);
}

/**
 * La revisión de la historia de la línea que le toca a cada revisión, la que está más cerca de su corte (como en
 * lugaresDeRevisiones), o null: de ella sale su informe, en su globo (pd_linea_informe). Pura.
 */
export function historiaDeRevisiones(revisiones: RevisionEnHistorial[], historia: RevisionDeLinea[]): (RevisionDeLinea | null)[] {
  const MARGEN = 10 * 60_000;
  const suya: (RevisionDeLinea | null)[] = revisiones.map(() => null);
  const hora = (x: string) => Date.parse(x);
  for (const h of historia) {
    const corte = h.corte ?? h.junto;
    const cerca = revisiones.map((r, i) => ({ i, lejos: Math.abs(hora(r.cuando) - hora(corte)), dentro: hora(r.cuando) >= hora(corte) - MARGEN && hora(r.cuando) <= hora(h.junto) })).filter((x) => x.dentro).sort((a, b) => a.lejos - b.lejos)[0];
    if (cerca) suya[cerca.i] = h;
  }
  return suya;
}

/** Lo que dice el globo de una revisión en la línea en grande: su fecha y su hora y, debajo, su informe, si lo tiene. Pura. */
export const globoDeRevision = (r: RevisionEnHistorial, h: RevisionDeLinea | null): string =>
  h ? `${fechaYHora(r.cuando)}\n${textoDelInforme(informeDeRevision(h))}` : fechaYHora(r.cuando);

/** Lo corrido, con lo que se arrastró o giró la rueda: nunca antes de lo más viejo ni después de ti. Pura. */
export const moverLinea = (corrido: number, delta: number, atras: number): number => Math.min(atras, Math.max(0, corrido + delta));

/** Lo que queda de sobra al repintar: se repinta antes de que el borde de lo dibujado llegue a la vista. */
const GUARDA_DEL_MARGEN = 60;
/** Si la cámara va a dejar lo dibujado, que alcanza MARGEN_COMPLETA a cada lado de donde se pintó: solo entonces se repinta. Pura. */
export const saleDelMargen = (corrido: number, pintadoCon: number): boolean => Math.abs(corrido - pintadoCon) > MARGEN_COMPLETA - GUARDA_DEL_MARGEN;

/** Lo que la rueda corre la línea: hacia abajo o a la derecha, al pasado, como una página que se desplaza. Pura. */
export const deltaDeRueda = (e: { deltaX: number; deltaY: number; deltaMode?: number }): number =>
  (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * (e.deltaMode === 1 ? 32 : 1);

/** La fecha y la hora de una revisión, las dos a la vista: en el globo al pasar sobre ella y en el título de su historial. Pura. */
export const fechaYHora = (iso: string) => new Date(iso).toLocaleString(lenguaje(), { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });

/** Lo que dibuja además de lo que viene en la línea normal: lo mismo que ella, para que sean una sola. */
export type DatosDeLinea = Pick<OpcionesLinea, 'historia' | 'revisado' | 'revision' | 'lote'> & { ramas: Rama[] };

export interface OpcionesLineaGrande extends Partial<DatosDeLinea> {
  ancho: number;
  alto: number;
  ahora: number;
  quieta?: boolean;
  corrido?: number;
  elegida?: number | null;
  /** Todo lo que hay hasta ti: de una vez, antes de volver, para no rehacer el dibujo a mitad de camino. */
  hastaTi?: boolean;
}

/**
 * El dibujo: la línea del enfoque con toda su historia, las ramas y lo que se juntó en cada revisión (svgLineaViva, con
 * `completa`), y encima la carita del director en cada revisión. Sin fechas: las dice el globo al pasar sobre ella. Pura.
 */
export function svgLineaGrande(revisiones: RevisionEnHistorial[], op: OpcionesLineaGrande): string {
  const { ramas = [], historia = [], elegida = null, corrido = 0, ...resto } = op;
  const lugares = lugaresDeRevisiones(revisiones, historia);
  const puntos = revisiones.map((r, i) => ({
    cuando: lugares[i],
    html: (x: number, y: number) => {
      const rojo = noCerro(r);
      const dice = `${t('lineaGrande.revisionAria', { fecha: fechaYHora(r.cuando) })}${rojo ? `. ${t('lineaGrande.noCerro')}` : ''}`;
      return `<g class="lg-revision${rojo ? ' no-cerro' : ''}${elegida === i ? ' sel' : ''}" data-lg-revision="${i}" role="button" tabindex="0" aria-label="${esc(dice)}"><g transform="translate(${x} ${y}) scale(1.05)"><circle class="lv-dir-fondo" r="9.5"/><circle class="lg-anillo" r="10.5"/><g class="lv-dir-nucleo lv-dir-cara" transform="translate(-8.5 -9.2) scale(0.17)">${caraDentro('feliz')}</g></g></g>`;
    },
  }));
  return svgLineaViva(ramas, { ...resto, historia, corrido, fondo: true, completa: true, lugarTu: LUGAR_TU, altoRamas: resto.alto * PARTE_DEL_ALTO, puntos });
}

/**
 * Desde qué momento se cuenta la vuelta para que empiece ya, al oprimir el botón: corridoAl descuenta la espera de la línea
 * normal, que aquí no hay, y anda a su misma velocidad (nmvzo9uaxtit). Pura.
 */
export const vueltaDesde = (ahora: number): number => ahora - ESPERA_REGRESO;

const FIN: Partial<Record<string, ClaveDeTexto>> = {
  limite: 'lineaGrande.fin.limite', detenida: 'lineaGrande.fin.detenida', sin_respuesta: 'lineaGrande.fin.sinRespuesta', cuenta: 'lineaGrande.fin.cuenta', no_arranco: 'lineaGrande.fin.noArranco',
};

export interface NombresDeHistorial {
  nombreModelo: (id: string) => string;
  nombreEsfuerzo: (id: string) => string;
}

/** El historial de una revisión, para el lado derecho de la ventana. Sin cifras de dinero, aunque el registro las trajera. */
export function historialHtml(r: RevisionEnHistorial, i: number, nombres: NombresDeHistorial): string {
  const cabeza = `<header class="cabeza-historial"><b>${esc(fechaYHora(r.cuando))}</b><button type="button" class="enlace" data-lg-cerrar-lado aria-label="${esc(t('lineaGrande.cerrarHistorial'))}">✕</button></header>`;
  if (!conHistorial(r)) return `${cabeza}<p class="como">${esc(t('lineaGrande.sinHistorial'))}</p>`;
  const fin = r.cerro ? t('lineaGrande.fin.cerro') : `${t('lineaGrande.noCerro')}${r.termino && FIN[r.termino] ? `: ${t(FIN[r.termino]!)}` : ''}`;
  const gasto = [
    r.tokens === null ? null : t('lineaGrande.tokens', { tokens: r.tokens.toLocaleString(lenguaje()) }),
    enTuPlanTexto(r.planAprox ?? undefined),
  ].filter(Boolean).join(' · ');
  const modelo = [r.modelo ? nombres.nombreModelo(r.modelo) : null, r.esfuerzo ? nombres.nombreEsfuerzo(r.esfuerzo) : null].filter(Boolean).join(' · ');
  const planeo = r.planeo.length
    ? `<h4>${esc(t('lineaGrande.planeo'))}</h4><ul class="lg-planeo">${r.planeo.map((p) => `<li class="${p.hecho ? 'hecho' : ''}">${p.hecho ? '✓' : '○'} ${esc(p.que)}</li>`).join('')}</ul>`
    : '';
  const hizo = [t('lineaGrande.notas', { n: r.hizo.notas }), t('lineaGrande.archivos', { n: r.hizo.archivos })].join(' · ');
  const commits = r.hizo.commits.length ? `<ul class="lg-commits">${r.hizo.commits.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>` : '';
  // Lo que eligió sumarle el titular (nmvzpxrkztit): se muestra solo lo que hubo
  const lista = (titulo: ClaveDeTexto, cosas: string[]) => (cosas.length ? `<h4>${esc(t(titulo))}</h4><ul class="lg-commits">${cosas.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>` : '');
  const negados = lista('lineaGrande.negados', r.negados ?? []);
  const otros = lista('lineaGrande.otrosModelos', (r.otrosModelos ?? []).map((o) => (o.para.length ? t('lineaGrande.otroModeloPara', { modelo: nombres.nombreModelo(o.modelo), para: o.para.join('; ') }) : nombres.nombreModelo(o.modelo))));
  const aparte = lista('lineaGrande.aparte', (r.aparte ?? []).map((a) => [
    t(a.tipo === 'urgencia' ? 'lineaGrande.urgencia' : 'lineaGrande.aclaracion'), fechaYHora(a.cuando), t('lineaGrande.notas', { n: a.notas }), ...(a.cerro ? [] : [t('lineaGrande.noCerro')]),
  ].join(' · ')));
  const resumen = `<p class="lg-fin${r.cerro ? '' : ' no-cerro'}">${esc(fin)}</p>
${gasto ? `<p class="lg-gasto">${esc(gasto)}</p>` : ''}${modelo ? `<p class="como">${esc(modelo)}</p>` : ''}
${planeo}<h4>${esc(t('lineaGrande.hizo'))}</h4><p class="como">${esc(hizo)}</p>${commits}${negados}${otros}${aparte}`;
  if (!r.conRegistro) return `${cabeza}${resumen}<p class="como">${esc(t('lineaGrande.sinConversacion'))}</p>`;
  // Con su registro, dos pestañas en vez del botón «Ver la conversación»: «Resumen», que abre arriba, y «Conversación», que
  // abre al final, donde terminó la revisión y está su avalancha (nota de voz del titular nmw5iimavtit)
  const pestana = (cual: 'resumen' | 'conversacion', clave: ClaveDeTexto, extra = '') => `<button type="button" role="tab" class="lg-pestana" aria-selected="${cual === 'resumen'}" data-lg-pestana="${cual}"${extra}>${esc(t(clave))}</button>`;
  return `${cabeza}<div class="lg-pestanas" role="tablist">${pestana('resumen', 'lineaGrande.pestanaResumen')}${pestana('conversacion', 'lineaGrande.pestanaConversacion', ` data-lg-conversacion="${i}"`)}</div>
<div class="lg-panel" role="tabpanel" data-lg-panel="resumen">${resumen}</div><div class="lg-panel" role="tabpanel" data-lg-panel="conversacion" hidden></div>`;
}

/** Lo que se desplaza: el panel de al lado y lo que lleva dentro. */
interface Desplazable { scrollTop: number; scrollHeight: number; querySelectorAll?: (s: string) => Iterable<Desplazable> }
/**
 * «Ver la conversación» abre al final, donde terminó la revisión y está su avalancha, no arriba: así se vuelve a mirar
 * sin bajar a buscarla (nota de voz del titular nmw5gj40stit, 6 de noviembre de 2026). El panel y la conversación de dentro,
 * si se desplaza sola, quedan en su punto más bajo.
 */
export function alFinalDeLaConversacion(lado: Desplazable): void {
  for (const el of lado.querySelectorAll?.('.chat-revision') ?? []) el.scrollTop = el.scrollHeight;
  lado.scrollTop = lado.scrollHeight;
}

export interface DatosLineaGrande extends NombresDeHistorial {
  /** Lo mismo que dibuja la línea normal, al día en cada pintada. */
  linea: () => DatosDeLinea;
  /** La conversación de un registro, ya en HTML; null si ya no está. */
  conversacion: (registro: string) => Promise<string | null>;
}

/** Abre la ventana: se pinta de una vez y sus revisiones llegan del servidor (si falla, salen las de la historia, sin historial). */
export function abrirLineaGrande(datos: DatosLineaGrande): void {
  const dlg = document.createElement('dialog');
  dlg.className = 'ventana-linea';
  dlg.innerHTML = `<header class="cabeza-linea-grande"><b>${esc(t('lineaGrande.titulo'))}</b><span class="como">${esc(t('lineaGrande.ayuda'))}</span><button type="button" class="enlace" data-lg-cerrar aria-label="${esc(t('lineaGrande.cerrar'))}">✕</button></header>
<div class="cuerpo-linea-grande"><div class="linea-grande" data-lg-caja></div><button type="button" class="lg-al-punto" data-lg-al-punto title="${esc(t('lineaGrande.alPunto'))}" aria-label="${esc(t('lineaGrande.alPunto'))}" hidden><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 6l6 6-6 6M12 6l6 6-6 6M21 5v14"/></svg></button><div class="lg-globo" data-lg-globo role="tooltip" hidden></div><aside class="lado-linea-grande" data-lg-lado hidden></aside></div>`;
  document.body.append(dlg);
  const caja = dlg.querySelector<HTMLElement>('[data-lg-caja]')!;
  const lado = dlg.querySelector<HTMLElement>('[data-lg-lado]')!;
  // «Resumen» abre arriba, en lo que se planeó y lo que se hizo (nmw5iimavtit)
  const alResumen = () => { lado.scrollTop = 0; };
  const globo = dlg.querySelector<HTMLElement>('[data-lg-globo]')!;
  const alPunto = dlg.querySelector<HTMLButtonElement>('[data-lg-al-punto]')!;
  const quieta = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  // Se toma al abrir y con cada consulta del Studio, no en cada cuadro de un arrastre
  let linea = datos.linea();
  const historia = () => linea.historia ?? [];
  let delServidor: RevisionEnHistorial[] = [];
  let revisiones = revisionesEnLinea(delServidor, historia());
  // Cada consulta del Studio avisa, traiga algo o no: con lo mismo no se rehace, y la onda no vuelve a empezar (nmvzps27qtit)
  const huellaDeLinea = () => JSON.stringify(linea);
  let huella = huellaDeLinea();
  /** Lo que llega mientras se arrastra espera a que se suelte (nmvztv1j7tit): ni siquiera entra a una repintada del margen. */
  let datosEsperan = false;
  const conDatosNuevos = () => {
    if (desde) {
      datosEsperan = true;
      return;
    }
    linea = datos.linea();
    revisiones = revisionesEnLinea(delServidor, historia());
    const nueva = huellaDeLinea();
    if (nueva === huella) return;
    huella = nueva;
    pintarAlQuedarLibre();
  };
  window.addEventListener('estudio:datos', conDatosNuevos);
  /** Lo corrido, en unidades del dibujo, y desde cuándo se cuenta la vuelta, si va volviendo (vueltaDesde, corridoAl). */
  let corrido = 0;
  let volviendo: number | null = null;
  let pintadoCon = 0;
  let elegida: number | null = null;
  const enVista = (ahora = Date.now()) => (quieta && volviendo !== null ? 0 : corridoAl(corrido, volviendo, ahora));
  const atrasDeLaCaja = () => Number(caja.querySelector('svg')?.getAttribute('data-atras') ?? 0);
  const pintar = (hastaTi = false) => {
    // El botón de volver, solo si está lejos del punto de siempre y no va ya de regreso
    alPunto.hidden = !corrido || volviendo !== null;
    if (!caja.clientWidth || !caja.clientHeight) return;
    const ahora = Date.now();
    pintadoCon = enVista(ahora);
    caja.innerHTML = svgLineaGrande(revisiones, { ...linea, ancho: caja.clientWidth / ZOOM, alto: caja.clientHeight / ZOOM, ahora, quieta, corrido: pintadoCon, elegida, hastaTi });
    if (quieta) caja.querySelector<SVGSVGElement>('svg')?.pauseAnimations?.();
  };
  /** Lo que llega de fondo mientras vuelve espera a que llegue: rehacer el dibujo a mitad de camino era el salto que se veía (nmvzps27qtit). */
  let porPintar = false;
  const pintarAlQuedarLibre = () => {
    if (volviendo !== null || desde || quietaDesde !== null) porPintar = true;
    else pintar();
  };
  /**
   * Arrastrar y la rueda corren solo la cámara, una vez por cuadro de la pantalla, como la vuelta y las otras dos barras
   * (correrCamaras): rehacer el dibujo en cada cuadro reiniciaba la onda y le cambiaba las curvas (nota de voz del titular
   * nmvztv1j7tit). Se repinta solo al ir a dejar lo dibujado, con la misma rejilla y la misma fase: no se nota.
   */
  let pedida = 0;
  const correrCamara = () => {
    pedida ||= requestAnimationFrame(() => {
      pedida = 0;
      if (!dlg.open) return;
      alPunto.hidden = !corrido || volviendo !== null;
      if (saleDelMargen(corrido, pintadoCon)) pintar();
      else caja.querySelector('g.lv-camara')?.setAttribute('transform', `translate(${n1(corrido)} 0)`);
    });
  };
  /**
   * La vuelta, cuadro a cuadro: corre solo la cámara, como las otras dos barras (correrCamaras). Lo que falta por verse se
   * dibujó una vez, al oprimir el botón: rehacer el dibujo a medio camino, cada MARGEN_COMPLETA / 2, era el salto (nmvzps27qtit).
   */
  let cuadro = 0;
  const volver = () => {
    cuadro = 0;
    if (!dlg.open || volviendo === null) return;
    const c = enVista();
    caja.querySelector('g.lv-camara')?.setAttribute('transform', `translate(${n1(c)} 0)`);
    if (c) {
      cuadro = requestAnimationFrame(volver);
      return;
    }
    corrido = 0;
    volviendo = null;
    if (porPintar) {
      porPintar = false;
      pintar();
    }
  };
  /** La toma donde va, también a media vuelta. */
  const tomar = () => {
    corrido = enVista();
    volviendo = null;
    cancelAnimationFrame(cuadro);
    cuadro = 0;
    alPunto.hidden = !corrido;
  };
  /** El botón de la esquina: dibuja de una vez lo que falta por verse y empieza a volver en ese mismo momento. */
  const empezarVuelta = () => {
    tomar();
    if (!corrido) return;
    volviendo = vueltaDesde(Date.now());
    pintar(true);
    cuadro = requestAnimationFrame(volver);
  };
  const elegir = (i: number | null) => {
    elegida = i;
    caja.querySelectorAll('[data-lg-revision]').forEach((g) => g.classList.toggle('sel', Number(g.getAttribute('data-lg-revision')) === i));
    const r = i === null ? undefined : revisiones[i];
    lado.hidden = !r;
    lado.innerHTML = r ? historialHtml(r, i!, datos) : '';
    lado.scrollTop = 0;
    ocultarGlobo();
  };
  /**
   * Mientras el globo está abierto, la línea entera se detiene: la vuelta a ti y las animaciones del dibujo; al cerrarlo,
   * sigue desde donde se detuvo, porque la vuelta se cuenta sin el tiempo que estuvo quieta (nota de voz del titular
   * nmw2oyzjttit, como en la barra: lineaViva.ts › congelar).
   */
  let quietaDesde: number | null = null;
  const congelarPorGlobo = (si: boolean) => {
    if (si === (quietaDesde !== null)) return;
    const svg = caja.querySelector<SVGSVGElement>('svg');
    if (si) {
      quietaDesde = Date.now();
      cancelAnimationFrame(cuadro);
      cuadro = 0;
      svg?.pauseAnimations?.();
      svg?.classList?.add('lv-congelada');
      return;
    }
    const quieto = Date.now() - quietaDesde!;
    quietaDesde = null;
    if (!quieta) svg?.unpauseAnimations?.();
    svg?.classList?.remove('lv-congelada');
    if (volviendo !== null) {
      volviendo += quieto;
      cuadro = requestAnimationFrame(volver);
    } else if (porPintar && !desde) {
      // Lo que llegó mientras estaba abierto se pinta ahora
      porPintar = false;
      pintar();
    }
  };
  const ocultarGlobo = () => {
    globo.hidden = true;
    congelarPorGlobo(false);
  };
  /**
   * El globo de una revisión: su fecha y su hora y, debajo, su informe (nmw2nig5ftit), cerca de su carita; con el clic se va
   * y se abre el historial.
   */
  const mostrarGlobo = (g: Element) => {
    const i = Number(g.getAttribute('data-lg-revision'));
    const r = revisiones[i];
    // Solo lo detiene un arrastre en curso: el de antes ya no cuenta al soltar (nota de voz del titular nmw5dr9rxtit). Y
    // mientras vuelve, la carita que pasa bajo el ratón no abre su globo: lo abría y la línea entera se detenía hasta que el
    // ratón saliera, y la vuelta iba a tirones, parando y siguiendo en cada carita (nota de voz del titular nmw76lu3qtit)
    if (!r || (arrastro && desde) || volviendo !== null) return;
    const cuerpo = globo.parentElement!;
    const marco = cuerpo.getBoundingClientRect();
    const marca = g.getBoundingClientRect();
    // Con la página escalada, los píxeles de pantalla no son los del estilo (escala.ts)
    const k = cuerpo.offsetWidth / Math.max(1, marco.width);
    globo.textContent = globoDeRevision(r, historiaDeRevisiones(revisiones, historia())[i] ?? null);
    globo.hidden = false;
    congelarPorGlobo(true);
    globo.style.left = `${Math.round((marca.left + marca.width / 2 - marco.left) * k)}px`;
    globo.style.top = `${Math.round((marca.top - marco.top) * k)}px`;
  };

  // Arrastrar y la rueda la mueven en el tiempo; un clic sin arrastrar elige
  let desde: { x: number; corrido: number; id: number } | null = null;
  let arrastro = false;
  /** La carita que se acaba de elegir con un clic: su globo no vuelve hasta que el ratón sale de ella. */
  let sinGlobo: string | null = null;
  caja.addEventListener('pointerdown', (e) => {
    if (e.button === 0) {
      tomar();
      desde = { x: e.clientX, corrido, id: e.pointerId };
      arrastro = false;
    }
  });
  caja.addEventListener('pointermove', (e) => {
    // Sin apretar, pasar sobre una carita abre su globo aunque el dibujo se haya rehecho debajo del ratón, sin que le
    // llegara su «pointerover» (nmw5dr9rxtit)
    if (!desde) {
      const g = (e.target as Element | null)?.closest?.('[data-lg-revision]');
      if (g && globo.hidden && g.getAttribute('data-lg-revision') !== sinGlobo) mostrarGlobo(g);
      return;
    }
    if (e.pointerId !== desde.id) return;
    const dx = e.clientX - desde.x;
    if (!arrastro && Math.abs(dx) < 4) return;
    if (!arrastro) {
      arrastro = true;
      ocultarGlobo();
      caja.setPointerCapture?.(e.pointerId);
      caja.classList.add('arrastrando');
    }
    corrido = moverLinea(desde.corrido, dx / ZOOM, atrasDeLaCaja());
    correrCamara();
  });
  const soltar = () => {
    desde = null;
    caja.classList.remove('arrastrando');
    // El clic que sigue a un arrastre se descarta (abajo); si no llega a la caja, porque se soltó fuera de ella, el arrastre
    // quedaba marcado y ninguna carita abría su globo al pasar hasta el siguiente clic (nota de voz del titular nmw5dr9rxtit)
    setTimeout(() => { arrastro = false; }, 0);
    // Lo que esperó mientras se arrastraba: los datos nuevos, o una pintada que se dejó para ahora
    const esperaban = datosEsperan;
    datosEsperan = false;
    if (esperaban) conDatosNuevos();
    if (porPintar && volviendo === null) {
      porPintar = false;
      pintar();
    }
  };
  caja.addEventListener('pointerup', soltar);
  caja.addEventListener('pointercancel', soltar);
  caja.addEventListener('pointerleave', () => {
    ocultarGlobo();
  });
  caja.addEventListener('pointerover', (e) => {
    const g = (e.target as Element).closest('[data-lg-revision]');
    if (g) mostrarGlobo(g);
  });
  caja.addEventListener('pointerout', (e) => {
    const g = (e.target as Element).closest('[data-lg-revision]');
    if (!g) return;
    ocultarGlobo();
    // Al salir de la carita que se eligió con un clic, su globo vuelve a salir al pasar
    if (!(e.relatedTarget as Element | null)?.closest?.(`[data-lg-revision="${g.getAttribute('data-lg-revision')}"]`)) sinGlobo = null;
  });
  caja.addEventListener('wheel', (e) => {
    e.preventDefault();
    ocultarGlobo();
    tomar();
    corrido = moverLinea(corrido, deltaDeRueda(e) / ZOOM, atrasDeLaCaja());
    correrCamara();
  }, { passive: false });
  caja.addEventListener('click', (e) => {
    if (arrastro) {
      arrastro = false;
      return;
    }
    const g = (e.target as Element).closest('[data-lg-revision]');
    if (g) {
      xDelClic = e.clientX - caja.getBoundingClientRect().left;
      // Con el clic su globo se va, y no vuelve mientras el ratón siga sobre ella
      sinGlobo = g.getAttribute('data-lg-revision');
      elegir(Number(g.getAttribute('data-lg-revision')));
    }
  });
  caja.addEventListener('keydown', (e) => {
    const g = (e.target as Element).closest?.('[data-lg-revision]');
    if (!g || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
    elegir(Number(g.getAttribute('data-lg-revision')));
  });
  dlg.addEventListener('click', (e) => {
    const b = e.target as Element;
    if (b.closest('[data-lg-cerrar]')) return dlg.close();
    if (b.closest('[data-lg-al-punto]')) return empezarVuelta();
    if (b.closest('[data-lg-cerrar-lado]')) return elegir(null);
    const pestana = b.closest<HTMLButtonElement>('[data-lg-pestana]');
    if (!pestana) return;
    // Una pestaña elegida: se marca y muestra su parte; «Resumen» vuelve arriba (nmw5iimavtit)
    for (const p of lado.querySelectorAll<HTMLButtonElement>('[data-lg-pestana]')) p.setAttribute('aria-selected', String(p === pestana));
    for (const p of lado.querySelectorAll<HTMLElement>('[data-lg-panel]')) p.hidden = p.dataset.lgPanel !== pestana.dataset.lgPestana;
    if (pestana.dataset.lgPestana === 'resumen') return alResumen();
    const panel = lado.querySelector<HTMLElement>('[data-lg-panel="conversacion"]');
    const con = b.closest<HTMLButtonElement>('[data-lg-conversacion]');
    if (!con || !panel) return;
    // Ya traída, se vuelve a ella al final; si no, se trae una vez
    if (panel.dataset.lgCargada) return alFinalDeLaConversacion(lado);
    const r = revisiones[Number(con.dataset.lgConversacion)];
    panel.dataset.lgCargada = '1';
    void datos.conversacion(r.registro).then((html) => {
      panel.innerHTML = html ?? `<p class="como">${esc(t('lineaGrande.sinConversacion'))}</p>`;
      if (panel.hidden) return;
      // Abre donde terminó la revisión, con la avalancha a la vista, no arriba (nmw5gj40stit); y otra vez en el cuadro
      // siguiente, por si algo creció al pintarse
      alFinalDeLaConversacion(lado);
      requestAnimationFrame(() => alFinalDeLaConversacion(lado));
    });
  });

  // Al abrirse o cerrarse el historial, la línea toma el ancho que le queda: lo que estabas mirando sigue en su lugar, y la
  // revisión que elegiste no queda detrás del historial que acaba de abrir
  let xDelClic: number | null = null;
  let anchoAntes = 0;
  const medidor = typeof ResizeObserver === 'function' ? new ResizeObserver(() => {
    const ancho = caja.clientWidth / ZOOM;
    if (anchoAntes && ancho !== anchoAntes && volviendo === null) {
      corrido = moverLinea(corrido, (anchoAntes - ancho) * LUGAR_TU, atrasDeLaCaja());
      const sobra = elegida !== null && xDelClic !== null ? xDelClic / ZOOM - (ancho - 30) : 0;
      if (sobra > 0) corrido = moverLinea(corrido, -sobra, atrasDeLaCaja());
    }
    anchoAntes = ancho;
    pintarAlQuedarLibre();
  }) : null;
  medidor?.observe(caja);
  dlg.addEventListener('close', () => {
    medidor?.disconnect();
    window.removeEventListener('estudio:datos', conDatosNuevos);
    cancelAnimationFrame(cuadro);
    cancelAnimationFrame(pedida);
    dlg.remove();
  });
  dlg.showModal();
  pintar();
  void fetch('/__estudio/director/historial-revisiones')
    .then((r) => (r.ok ? r.json() : { revisiones: [] }))
    .catch(() => ({ revisiones: [] }))
    .then((x: { revisiones: RevisionEnHistorial[] }) => {
      if (!dlg.open) return;
      delServidor = x.revisiones;
      revisiones = revisionesEnLinea(delServidor, historia());
      pintarAlQuedarLibre();
    });
}
