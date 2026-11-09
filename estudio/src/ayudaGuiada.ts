// La ayuda guiada del Studio y el modo ayuda (pedido pd_ayuda_guiada). Nada de ayuda sale sola: solo con el modo ayuda
// encendido por la persona (nmw6rjf3utit, nmw6rw57ntit). Entonces la ayuda de cada sección se ofrece una vez,
// la primera vez que se abre con algo que explicar a la vista y sin el director revisando (nmw3q68j8tit, nmw2qqxi5tit,
// nmw3s4y67tit, nmw10lshztit): en «Hoy», cinco globos (nmw5725pttit, sus textos en nmw5dgxqstit); en el Buzón y en los
// documentos, cuatro cada uno (nmw5mkwrhtit, nmw5mkyrktit), en ese orden (nmw5mk3vdtit). Uno a la vez, cada uno señalando
// su parte con lo demás oscurecido (nmw1gb7yntit), con «Siguiente», «Saltar la ayuda» y Esc (nmw3y0jw7tit) y la cuenta
// «2 de 5» (nmw41ktn7tit); un clic fuera no hace nada (nmw41kk8jtit). Que ya se vio lo recuerda el Studio, no el navegador,
// una vez para todos los proyectos (nmw2nm62vtit, nmw2p7ouktit: estudio.local.json › ayudasVistas). El globo del
// recorrido resalta más, con su borde de acento grueso, un pulso suave solo al aparecer (nmw5o6zn5tit) y lo demás más oscuro
// (nmw5m5v8otit).
// El modo ayuda se enciende y se apaga con el botón «Ayuda», con su ícono, junto a «Pedir revisión» (nmw5ggnfdtit):
// encendido se ve oprimido, con el mismo nombre (nmw5irt7vtit), sigue así al pasar de una sección a otra hasta que se apaga
// (nmw3q6v1stit), y explica cada parte de la sección una a la vez, al pasar el ratón sobre ella (nmw5irbo3tit); en «Hoy»,
// también «¿Dónde quedamos?» y la línea del proyecto (nmw5mko9dtit). Arriba de la sección trae «Ver otra vez el recorrido
// de esta sección» (nmw33ogfhtit). Convive con los «?» de las palabras (nmw1g9oqdtit). Cada globo queda dentro de la
// ventana (lugarDelGlobo.ts, nmw5m1kzwtit).
import { altoDeVentana, anchoDeVentana, rectaEnPagina } from './escala';
import { instalarGloboDeTitulos } from './globoDeTitulos';
import { lugarDelGlobo } from './lugarDelGlobo';
import { t, type ClaveDeTexto } from './textos';
import { esc } from './util';

export type SeccionAyuda = 'hoy' | 'buzon' | 'documentos' | 'ruta' | 'modelo';
type Parte = { readonly id: string; readonly selector: string };

/** Las cinco partes de «Hoy», en el orden de sus globos, y dónde está cada una en la pantalla. */
export const PARTES_HOY = [
  { id: 'mision', selector: '.mision-c.sigue' },
  { id: 'botones', selector: '.mision-c.sigue :is(.listo-paso, .hazlo-paso, .boton-opcion, .aclarar-paso)' },
  { id: 'sigue', selector: '.cola-m' },
  { id: 'nota', selector: '.mision-c.sigue :is(.comentar-paso, .al-director)' },
  { id: 'revision', selector: '.pedir-revision' },
] as const;
export type ParteHoy = (typeof PARTES_HOY)[number]['id'];
/** Las dos que en «Hoy» explica solo el modo ayuda, al pasar el ratón: arriba, «¿Dónde quedamos?»; a la izquierda, la línea del proyecto. */
const PARTES_SOLO_MODO_HOY = [
  { id: 'quedamos', selector: '[data-donde-quedamos]' },
  { id: 'linea', selector: ':is(#linea-viva, #lupa-linea)' },
] as const;
/** Las cuatro del Buzón: la lista de notas, los filtros por tipo, «Buscar en el Buzón» y una nota sin leer. */
const PARTES_BUZON = [
  { id: 'lista', selector: '#resultados-buzon .notas-lista' },
  { id: 'filtros', selector: '.filtro-tipo.filtro-pestanas' },
  { id: 'buscar', selector: '.buscar-buzon' },
  { id: 'sinLeer', selector: '#resultados-buzon .nota-d:not(.respondida)' },
] as const;
/** Las cuatro de los documentos: la columna «Documentos», «Entendido», «Para decidir» y el ✉ de cada idea. */
const PARTES_DOCUMENTOS = [
  { id: 'columna', selector: '.lista-docs' },
  { id: 'entendido', selector: '.trozo .entendido' },
  { id: 'decidir', selector: '.botones-decision' },
  { id: 'comentar', selector: '.comentar-idea' },
] as const;
/** Las cuatro de «La ruta»: la barra de las fases, la puerta, los pedidos y las propuestas de la fase, y las misiones pasadas (las que ya aprobó el director). */
const PARTES_RUTA = [
  { id: 'fases', selector: '.ruta-delgada' },
  { id: 'puerta', selector: '.puerta' },
  { id: 'pedidos', selector: ':is([data-ancla="r-pedidos"], [data-ancla="r-aprobadas"], .p-propuestas .panel-d)' },
  { id: 'pasadas', selector: '.mision-pasada' },
] as const;
/** Las tres de «Modelo y consumo»: el modelo y el esfuerzo, los permisos y lo que gasta cada revisión. */
const PARTES_MODELO = [
  { id: 'director', selector: '[data-ancla="m-director"]' },
  { id: 'permisos', selector: '[data-ancla="m-permisos"]' },
  { id: 'consumo', selector: '[data-ancla="m-consumo"]' },
] as const;

/**
 * Cada sección: su vista, los globos de su recorrido, las partes que explica el modo ayuda (las del recorrido y, en «Hoy»,
 * dos más) y lo que tiene que estar a la vista para ofrecer su recorrido («que espere a que haya algo», nmw2qqxi5tit):
 * tu misión, una nota en el Buzón, un documento abierto.
 */
export const SECCIONES: Record<SeccionAyuda, { vista: string; recorrido: readonly Parte[]; modo: readonly Parte[]; espera: string }> = {
  hoy: { vista: 'misiones', recorrido: PARTES_HOY, modo: [...PARTES_HOY, ...PARTES_SOLO_MODO_HOY], espera: '.mision-c.sigue' },
  buzon: { vista: 'buzon', recorrido: PARTES_BUZON, modo: PARTES_BUZON, espera: '#resultados-buzon .nota-d' },
  documentos: { vista: 'documentos', recorrido: PARTES_DOCUMENTOS, modo: PARTES_DOCUMENTOS, espera: '.trozo .entendido' },
  ruta: { vista: 'ruta', recorrido: PARTES_RUTA, modo: PARTES_RUTA, espera: '.ruta-delgada' },
  modelo: { vista: 'modelo', recorrido: PARTES_MODELO, modo: PARTES_MODELO, espera: ':is([data-ancla="m-director"], [data-ancla="m-permisos"], [data-ancla="m-consumo"])' },
};
/** La sección de ayuda de una vista del Studio, si tiene. Pura. */
export const seccionDeVista = (vista: string): SeccionAyuda | null =>
  (Object.keys(SECCIONES) as SeccionAyuda[]).find((s) => SECCIONES[s].vista === vista) ?? null;

/** Lo que dice el globo de una parte, en el idioma de la interfaz. */
export const textoDeParte = (id: string, seccion: SeccionAyuda = 'hoy'): string => t(`ayuda.${seccion}.${id}` as ClaveDeTexto);

/**
 * Si toca ofrecer la ayuda de la sección de esta vista: solo con el modo ayuda encendido por la persona (notas de voz del
 * titular nmw6rjf3utit y nmw6rw57ntit: ningún recorrido ni globo de ayuda sale solo, en ninguna vista), con algo que
 * explicar a la vista, sin el director revisando y sin haberla visto. Pura.
 */
export const debeOfrecerse = (o: { vista: string; vistas: readonly string[]; revisando: boolean; hayAlgo: boolean; ayuda: boolean }): boolean => {
  const seccion = seccionDeVista(o.vista);
  return o.ayuda && !!seccion && o.hayAlgo && !o.revisando && !o.vistas.includes(seccion);
};

/** Las partes que tienen globo: solo las que están en la pantalla, en su orden. Pura. */
export const partesALaVista = (hay: (selector: string) => boolean, seccion: SeccionAyuda = 'hoy'): string[] =>
  SECCIONES[seccion].recorrido.filter((p) => hay(p.selector)).map((p) => p.id);

/** Un globo de la ayuda: su texto, «Saltar la ayuda», la cuenta («2 de 5») y «Siguiente» («Terminar» en el último). Pura. */
export function globoDeGuiaHtml(id: string, i: number, total: number, seccion: SeccionAyuda = 'hoy'): string {
  const ultimo = i === total - 1;
  return `<div class="globo-guia" role="dialog" aria-labelledby="globo-guia-texto" data-guia-globo>`
    + `<p id="globo-guia-texto">${esc(textoDeParte(id, seccion))}</p>`
    + `<div class="pie-guia"><button type="button" class="enlace" data-guia-saltar>${esc(t('ayuda.saltar'))}</button>`
    + `<small class="cuenta-guia">${esc(t('ayuda.cuenta', { n: i + 1, total }))}</small>`
    + `<button type="button" class="primario" data-guia-siguiente>${esc(t(ultimo ? 'ayuda.terminar' : 'ayuda.siguiente'))}</button></div></div>`;
}

/**
 * El ícono del modo ayuda: un «?» bien dibujado dentro de un globo de diálogo (nota de voz del titular nmw6u6ikqtit: el
 * salvavidas no se entendía). El globo lo distingue del «?» suelto de las palabras del glosario. Apagado, cruzado por una
 * raya; encendido, entero (el círculo se pinta de su color con «activo»). Pura.
 */
const iconoAyuda = (encendido: boolean): string =>
  '<svg class="icono icono-pregunta" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">'
  + '<path d="M12 3.2c5 0 8.8 3.4 8.8 7.7s-3.8 7.7-8.8 7.7c-1 0-2-.1-2.9-.4L5 20.6l1.1-3.6C4.3 15.6 3.2 13.4 3.2 10.9 3.2 6.6 7 3.2 12 3.2z"/>'
  + '<path class="signo-pregunta" d="M9.6 8.9a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2-2.4 3.4" stroke-width="2.1"/><circle class="punto-pregunta" cx="12" cy="15.6" r="1.15" fill="currentColor" stroke="none"/>'
  + (encendido ? '' : '<path class="raya-apagado" d="M3.5 20.5L20.5 3.5" stroke-width="2.4"/>')
  + '</svg>';

/**
 * El círculo del modo ayuda, entre los del director (index.html › atajos-director), siempre a la vista, también en el modo
 * enfoque (nota de voz del titular nmw6p8kjztit: antes estaba en la cabecera, y en el enfoque había que salir para apagarla):
 * su nombre dice si está encendida o apagada, y su ícono también. Pura.
 */
export const estadoDelAtajoAyuda = (encendido: boolean): { etiqueta: string; titulo: string; icono: string } => ({
  etiqueta: t(encendido ? 'ayuda.atajoEncendida' : 'ayuda.atajoApagada'),
  titulo: t(encendido ? 'ayuda.botonTituloApagar' : 'ayuda.botonTitulo'),
  icono: iconoAyuda(encendido),
});

/** Pone el círculo del modo ayuda como está ahora: oprimido y de color si está encendida, con su nombre y su ícono. */
export function pintarAtajoAyuda(): void {
  const e = estadoDelAtajoAyuda(modo);
  for (const b of document.querySelectorAll<HTMLButtonElement>('.atajo[data-modo-ayuda]')) {
    b.hidden = false;
    b.setAttribute('aria-pressed', String(modo));
    b.classList.toggle('activo', modo);
    b.dataset.etiqueta = e.etiqueta;
    b.setAttribute('aria-label', e.etiqueta);
    b.title = e.titulo;
    if (b.dataset.icono !== String(modo)) { b.innerHTML = e.icono; b.dataset.icono = String(modo); }
  }
}

/** Arriba de la sección, con el modo ayuda encendido: para ver otra vez su recorrido. Pura. */
export const repetirHtml = (): string => `<p class="repetir-guia"><button type="button" class="enlace" data-guia-repetir>${esc(t('ayuda.repetir'))}</button></p>`;

// ── En la página ────────────────────────────────────────────────────────────────────────────────────────────────────
const MODO = 'estudio.ayuda.modo';
let modo = false;
try { modo = typeof localStorage !== 'undefined' && localStorage.getItem(MODO) === 'si'; } catch { /* sin almacenamiento: apagado */ }
export const modoAyuda = (): boolean => modo;

let guia: { i: number; seccion: SeccionAyuda; partes: string[]; alTerminar: () => void } | null = null;
export const guiaActiva = (): boolean => guia !== null;

const selectorDe = (seccion: SeccionAyuda, id: string) => SECCIONES[seccion].modo.find((p) => p.id === id)!.selector;
/** La ventana, en píxeles de la página (escala.ts): lo que se escribe en un style lo es. */
const ventana = () => ({ ancho: anchoDeVentana(), alto: altoDeVentana() });

/**
 * La primera parte con ese selector que se ve en la pantalla: lo que está dentro de algo plegado (las notas ya respondidas
 * del Buzón, en su «Ya respondidas» cerrado) existe pero no se ve, y su globo señalaría la nada.
 */
export const aLaVista = (selector: string): HTMLElement | null =>
  [...document.querySelectorAll<HTMLElement>(selector)].find((e) => e.getClientRects().length > 0) ?? null;

/** Empieza la ayuda de una sección con las partes que están a la vista; al terminarla o saltarla, alTerminar. */
export function empezarGuia(seccion: SeccionAyuda, alTerminar: () => void): void {
  if (!modo) return; // sin el modo ayuda encendido, ningún recorrido (nmw6rjf3utit)
  const partes = partesALaVista((s) => !!aLaVista(s), seccion);
  if (!partes.length) return;
  guia = { i: 0, seccion, partes, alTerminar };
  pintarGuia();
}

/** Pinta el globo que toca sobre su parte; también después de cada repintado del Studio, que cambia los elementos. */
export function pintarGuia(): void {
  document.querySelector('[data-guia-capa]')?.remove();
  if (!guia) return;
  const id = guia.partes[guia.i];
  const el = aLaVista(selectorDe(guia.seccion, id));
  const capa = document.createElement('div');
  capa.className = 'capa-guia';
  capa.dataset.guiaCapa = '';
  capa.innerHTML = `<div class="hueco-guia" aria-hidden="true"></div>${globoDeGuiaHtml(id, guia.i, guia.partes.length, guia.seccion)}`;
  document.body.append(capa);
  const hueco = capa.querySelector<HTMLElement>('.hueco-guia')!;
  const globo = capa.querySelector<HTMLElement>('[data-guia-globo]')!;
  if (el) {
    el.scrollIntoView({ block: 'nearest' });
    const r = rectaEnPagina(el.getBoundingClientRect());
    Object.assign(hueco.style, { left: `${r.left - 6}px`, top: `${r.top - 6}px`, width: `${r.width + 12}px`, height: `${r.height + 12}px` });
    // Fuera del hueco, que tiene 6 px de aire y el borde del globo
    const l = lugarDelGlobo(r, { ancho: globo.offsetWidth, alto: globo.offsetHeight }, ventana(), { separacion: 16 });
    Object.assign(globo.style, { top: `${l.top}px`, left: `${l.left}px` });
    globo.dataset.lado = l.lado;
  } else hueco.hidden = true;
  capa.querySelector<HTMLButtonElement>('[data-guia-siguiente]')?.focus({ preventScroll: true });
}

function terminarGuia(): void {
  const fin = guia?.alTerminar;
  guia = null;
  pintarGuia();
  fin?.();
}

// El globo del modo ayuda: uno solo, junto a la parte que está bajo el ratón
function globoDelModo(): HTMLElement {
  let g = document.querySelector<HTMLElement>('[data-globo-modo]');
  if (!g) {
    g = document.createElement('div');
    g.className = 'globo-modo';
    g.dataset.globoModo = '';
    g.setAttribute('role', 'tooltip');
    g.hidden = true;
    document.body.append(g);
  }
  return g;
}
let parteBajo: HTMLElement | null = null;
function explicar(el: HTMLElement | null, texto: string | null): void {
  parteBajo?.classList.remove('parte-explicada');
  parteBajo = el;
  const g = globoDelModo();
  if (!el || !texto) { g.hidden = true; return; }
  el.classList.add('parte-explicada');
  g.textContent = texto;
  g.hidden = false;
  const l = lugarDelGlobo(rectaEnPagina(el.getBoundingClientRect()), { ancho: g.offsetWidth, alto: g.offsetHeight }, ventana());
  g.style.top = `${l.top}px`;
  g.style.left = `${l.left}px`;
}

/** Enciende o apaga el modo ayuda; repintar pone el botón oprimido y «Ver otra vez el recorrido». */
function cambiarModo(repintar: () => void): void {
  modo = !modo;
  try { localStorage.setItem(MODO, modo ? 'si' : 'no'); } catch { /* sin almacenamiento: solo esta visita */ }
  document.body.classList.toggle('modo-ayuda', modo);
  // Apagarla en medio de un recorrido lo cierra (el círculo queda encima de su capa, nmw6rw57ntit)
  if (!modo && guia) terminarGuia();
  if (!modo) explicar(null, null);
  pintarAtajoAyuda();
  repintar();
}

/** Los oyentes de la ayuda, una vez: los botones de los globos, Esc, el ratón del modo ayuda y el tamaño de la ventana. */
export function instalarAyuda(o: { repintar: () => void; repetir: () => void; seccion: () => SeccionAyuda | null }): void {
  document.body.classList.toggle('modo-ayuda', modo);
  pintarAtajoAyuda();
  document.addEventListener('click', (e) => {
    const b = e.target as Element;
    if (b.closest('[data-modo-ayuda]')) return cambiarModo(o.repintar);
    if (b.closest('[data-guia-repetir]')) return o.repetir();
    if (!guia) return;
    if (b.closest('[data-guia-saltar]')) return terminarGuia();
    if (b.closest('[data-guia-siguiente]')) {
      if (guia.i + 1 >= guia.partes.length) return terminarGuia();
      guia.i++;
      return pintarGuia();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && guia) { e.preventDefault(); terminarGuia(); }
  });
  document.addEventListener('mouseover', (e) => {
    const seccion = o.seccion();
    if (!modo || guia || !seccion) return;
    const el = e.target as Element;
    for (const p of [...SECCIONES[seccion].modo].reverse()) {
      const parte = el.closest<HTMLElement>(p.selector);
      if (parte) { if (parte !== parteBajo) explicar(parte, textoDeParte(p.id, seccion)); return; }
    }
    if (parteBajo) explicar(null, null);
  });
  addEventListener('resize', () => { if (guia) pintarGuia(); });
  // Después de los oyentes del modo ayuda: así su globo manda y el de los títulos no lo duplica
  instalarGloboDeTitulos();
}
