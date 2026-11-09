/**
 * El control de los sonidos, en la cabecera junto al tema: un botón con su altavoz (tachado si los efectos están
 * apagados) que abre un panel pequeño, como el de un juego: «Efectos» y «Música», cada uno con su interruptor y su
 * volumen (la música, con su pista: solo las de fondo), y «Los sonidos de cada momento», un diálogo para elegir y oír el
 * efecto de cada momento. Sin la carpeta de los sonidos (estudio/sonidos), el panel lo dice en vez de los controles.
 */
import { icono } from './iconos';
import { anchoDeVentana, rectaEnPagina } from './escala';
import { esc } from './util';
import { ajustes, cambiarAjustes, cargarSonidos, efectoDe, efectoDeSiempre, MOMENTOS, nombreDeMomento, pistasDeFondo, probar, sonidosCargados, type Momento } from './sonidos';
import { elegirVoz, oirVoz, prepararConLaVozNueva, sinVozAhora, vocesNaturales, vozElegida } from './guiaLectura';
import { activarSelectoresLista, htmlSelectorLista, type SelectorLista } from './selectorLista';
import { idiomaActual, t } from './textos';
import { vozPorDefecto, type VozNatural } from '../../src/director/voz';

export const botonSonido = () => {
  const a = ajustes();
  const sin = sonidosCargados() === null;
  const apagados = sin || !a.efectos;
  const titulo = sin ? t('sonidos.sinSonidos') : t('sonidos.titulo', { efectos: t(a.efectos ? 'sonidos.encendidos' : 'sonidos.apagados'), musica: t(a.musica ? 'sonidos.encendida' : 'sonidos.apagada') });
  return `<button type="button" class="boton-suave boton-tema boton-sonido${apagados ? ' apagado' : ''}" data-sonido aria-haspopup="true" aria-expanded="${!!panel}" title="${esc(titulo)}" aria-label="${esc(titulo)}">${icono(apagados ? 'silencio' : 'altavoz')}</button>`;
};

let panel: HTMLElement | null = null;
/**
 * Si el panel se abrió desde el modo enfoque (el botón de su franja; pd_controles_enfoque): un menú pequeño con solo los
 * efectos y la música, con sus volúmenes y su pista. Lo de cada momento y la voz de la niebla se eligen en «Sonidos».
 */
let compacto = false;
/** El lugar, entre los botones de sonido, del que lo abrió: se dibujan de nuevo al cerrar, y el foco vuelve a ese. */
let origen = 0;

const botones = () => [...document.querySelectorAll<HTMLElement>('[data-sonido]')];
const pct = (v: number) => Math.round(v * 100);

/** Las voces de Kokoro instaladas, de todos los idiomas: undefined mientras se buscan; vacía si no hay ninguna. */
let voces: VozNatural[] | undefined;

/**
 * La voz que lee con la niebla (pd_voz_alta: elegirla y escucharla en «Sonidos»): las de Kokoro de este computador, con ▶
 * para oír una frase (decisión del titular, 26 de octubre de 2026, nota de voz nmvpdu9zqtit: son las únicas). Lista y guarda
 * las del idioma de la interfaz (nota del titular nmvyq4syjtit, 1 de noviembre de 2026: al pasar a inglés seguían las de
 * español, porque salían del texto abierto y de la lista de cuando se abrió el panel); lo que se lee sigue usando la voz
 * del idioma de cada texto. Se guarda en este navegador; sin elegir, lee la de por defecto. Sin ninguna instalada, dice que
 * Kokoro no está instalado y cómo instalarlo, en vez de un selector vacío.
 */
export function grupoVoz(todas: VozNatural[] | undefined = voces): string {
  const titulo = `<b>${esc(t('sonidos.vozTitulo'))}</b>`;
  if (todas === undefined) return `<div class="ps-grupo">${titulo}<p class="ps-nota">${esc(t('sonidos.buscandoVoces'))}</p></div>`;
  const idioma = idiomaActual();
  const naturales = todas.filter((v) => v.idioma === idioma);
  if (!naturales.length) return `<div class="ps-grupo">${titulo}<p class="ps-nota">${esc(sinVozAhora(false, idioma))}</p></div>`;
  const elegida = vozElegida(idioma);
  const actual = naturales.some((v) => v.id === elegida) ? elegida : '';
  // Sin elegir, lee la de por defecto del idioma (o la primera de él)
  const defecto = vozPorDefecto(idioma, naturales);
  const opcion = (v: VozNatural) => `<option value="${esc(v.id)}"${v.id === actual ? ' selected' : ''}>${esc(v.nombre)}</option>`;
  return `<div class="ps-grupo">${titulo}
      <span class="ps-fila ps-vol ps-voz"><select data-ps="voz" aria-label="${esc(t('sonidos.vozAria'))}"><option value=""${actual ? '' : ' selected'}>${esc(t('sonidos.vozAutomatica', { voz: defecto?.nombre ?? t('sonidos.ninguna') }))}</option>${naturales.map(opcion).join('')}</select>
      <button type="button" class="boton-suave" data-ps-oir-voz aria-label="${esc(t('sonidos.oirVoz'))}" title="${esc(t('sonidos.oirla'))}">▶</button></span>
      <p class="ps-nota">${esc(t('sonidos.vozNota'))}</p>
    </div>`;
}

/**
 * Elegir en «Sonidos» guarda para el idioma de la interfaz, el de la lista que se ve, y lo que ya estaba preparado o en
 * cola con la voz de antes se vuelve a preparar con la nueva, en segundo plano (nmw2h8qm9tit).
 */
export const elegirVozDelPanel = (id: string | null) => {
  elegirVoz(id, idiomaActual());
  prepararConLaVozNueva(idiomaActual());
};

function contenido(): string {
  return compacto ? contenidoSonidos(false) : contenidoSonidos() + grupoVoz();
}

function contenidoSonidos(conMomentos = true): string {
  const l = sonidosCargados();
  if (l === undefined) return `<p class="ps-nota">${esc(t('sonidos.buscando'))}</p>`;
  if (!l) return `<p class="ps-nota"><b>${esc(t('sonidos.sinSonidos'))}.</b> ${esc(t('sonidos.noHayDetalle'))}</p>`;
  const a = ajustes();
  const pistas = pistasDeFondo(l);
  return `<div class="ps-grupo">
      <label class="ps-fila"><input type="checkbox" data-ps="efectos"${a.efectos ? ' checked' : ''}><b>${esc(t('sonidos.efectos'))}</b></label>
      <label class="ps-fila ps-vol"><span>${esc(t('sonidos.volumen'))}</span><input type="range" min="0" max="100" step="5" value="${pct(a.volEfectos)}" data-ps="volEfectos" aria-label="${esc(t('sonidos.volEfectos'))}"${a.efectos ? '' : ' disabled'}></label>
    </div>
    <div class="ps-grupo">
      <label class="ps-fila"><input type="checkbox" data-ps="musica"${a.musica ? ' checked' : ''}${pistas.length ? '' : ' disabled'}><b>${esc(t('sonidos.musica'))}</b></label>
      <label class="ps-fila ps-vol"><span>${esc(t('sonidos.volumen'))}</span><input type="range" min="0" max="100" step="5" value="${pct(a.volMusica)}" data-ps="volMusica" aria-label="${esc(t('sonidos.volMusica'))}"${a.musica ? '' : ' disabled'}></label>
      <label class="ps-fila ps-vol"><span>${esc(t('sonidos.pista'))}</span><select data-ps="pista" aria-label="${esc(t('sonidos.pistaAria'))}">${pistas.map(([id, m]) => `<option value="${esc(id)}"${id === a.pista ? ' selected' : ''}>${esc(m.nombre)}</option>`).join('')}</select></label>
    </div>
    ${conMomentos ? `<button type="button" class="boton-suave ps-momentos" data-ps-momentos>${esc(t('sonidos.momentos'))}</button>` : ''}`;
}

function pintarPanel() {
  if (panel) panel.innerHTML = contenido();
}

/** Al cambiar el idioma de la interfaz: si el panel está abierto, sus textos y sus voces pasan al idioma nuevo, y lo mismo el nombre de su botón. */
export function alCambiarIdioma() {
  pintarPanel();
  refrescarBotones();
}

/**
 * El panel, bajo su botón; se cierra con otro clic en el botón, fuera de él o con Esc. Desde la franja del modo enfoque
 * (un botón dentro de .grupo-enfoque) abre ahí mismo, encima del velo y sin salir del enfoque, su versión pequeña.
 */
function abrirPanel(b: HTMLElement) {
  compacto = !!b.closest('.grupo-enfoque');
  origen = botones().indexOf(b);
  panel = document.createElement('div');
  panel.className = 'panel-sonido';
  panel.setAttribute('role', 'group');
  panel.setAttribute('aria-label', t('sonidos.grupo'));
  // Un diálogo modal deja todo lo de afuera por debajo: si el botón está en uno («¿Dónde quedamos?»), el menú va dentro de él
  (b.closest('dialog') ?? document.body).append(panel);
  // En píxeles de la página (escala.ts): lo que se escribe en el style del panel lo es
  const r = rectaEnPagina(b.getBoundingClientRect());
  panel.style.top = `${Math.round(r.bottom + 6)}px`;
  panel.style.right = `${Math.max(8, Math.round(anchoDeVentana() - r.right))}px`;
  pintarPanel();
  void cargarSonidos().then(pintarPanel);
  // La voz de la niebla solo está en el panel entero: el pequeño no la busca
  if (!compacto) {
    void vocesNaturales().then((n) => {
      voces = n;
      pintarPanel();
    });
  }
  b.setAttribute('aria-expanded', 'true');
  panel.querySelector<HTMLElement>('input, select, button')?.focus();
}

/** Cierra el panel; con `volverA` (el lugar de un botón), el foco vuelve a ese botón, que se dibuja de nuevo. */
function cerrarPanel(volverA = -1) {
  panel?.remove();
  panel = null;
  refrescarBotones();
  if (volverA >= 0) botones()[volverA]?.focus();
}

function refrescarBotones() {
  botones().forEach((x) => (x.outerHTML = botonSonido()));
}

/**
 * El diálogo de cada momento: su efecto (de la lista de sonidos del Studio) y ▶ para oírlo. Cada efecto se elige en el
 * selector propio del Studio (selectorLista.ts; pd_sonidos_flechas): con las flechas, cada sonido se oye al pasar sin
 * elegirlo; con el ratón, el que se detiene bajo el puntero; elegir uno lo oye y lo guarda en este navegador.
 */
function abrirMomentos() {
  const l = sonidosCargados();
  if (!l) return;
  cerrarPanel();
  const a = ajustes();
  const nombres = Object.keys(l.efectos).sort();
  const selectores: SelectorLista[] = MOMENTOS.map((m) => {
    const deSiempre = efectoDeSiempre(m.id, l.efectos);
    return {
      id: `snd-${m.id}`,
      clave: m.id,
      nombre: nombreDeMomento(m.id),
      valor: efectoDe(m.id, a, l.efectos),
      opciones: nombres.map((n) => ({ valor: n, texto: n === deSiempre ? t('sonidos.deSiempre', { efecto: n }) : n })),
    };
  });
  const dlg = document.createElement('dialog');
  dlg.className = 'dialogo-director dialogo-sonidos';
  dlg.innerHTML = `<form method="dialog">
    <h2>${esc(t('sonidos.momentos'))}</h2>
    <p class="ayuda">${esc(t('sonidos.momentosAyuda'))}</p>
    <ul class="lista-momentos">${MOMENTOS.map((m, i) => `<li><label for="snd-${m.id}">${esc(nombreDeMomento(m.id))}</label>
        <span class="ps-elegir">${htmlSelectorLista(selectores[i])}
        <button type="button" class="boton-suave" data-oir="${m.id}" aria-label="${esc(t('sonidos.oirMomento', { nombre: nombreDeMomento(m.id) }))}" title="${esc(t('sonidos.oirlo'))}">▶</button></span></li>`).join('')}</ul>
    <div class="botones"><button type="submit" class="primario">${esc(t('sonidos.cerrar'))}</button></div>
  </form>`;
  document.body.append(dlg);
  activarSelectoresLista(dlg, selectores, {
    alPasar: (efecto) => probar(efecto),
    alElegir: (efecto, s) => {
      const m = s.clave as Momento;
      const elegidos = { ...ajustes().elegidos };
      if (efecto === efectoDeSiempre(m, l.efectos)) delete elegidos[m];
      else elegidos[m] = efecto;
      cambiarAjustes({ elegidos });
      probar(efecto);
    },
  });
  dlg.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-oir]');
    if (b) probar(efectoDe(b.dataset.oir as Momento, ajustes(), l.efectos));
  });
  dlg.addEventListener('close', () => dlg.remove());
  dlg.showModal();
}

if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    const destino = e.target as HTMLElement;
    const b = destino.closest<HTMLElement>('[data-sonido]');
    if (b) {
      if (panel) cerrarPanel(botones().indexOf(b));
      else abrirPanel(b);
      return;
    }
    if (destino.closest('[data-ps-momentos]')) return abrirMomentos();
    if (destino.closest('[data-ps-oir-voz]')) return oirVoz(vozElegida(idiomaActual()), idiomaActual());
    if (panel && !destino.closest('.panel-sonido')) cerrarPanel();
  });
  // Esc cierra el panel y nada más (en la captura, antes que nadie): con el panel abierto en el modo enfoque, no se sale
  // del enfoque; el siguiente Esc, ya sin panel, sí
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !panel) return;
    // Dentro de un diálogo, sin esto Esc también lo cerraría
    e.preventDefault();
    e.stopPropagation();
    cerrarPanel(origen);
  }, true);
  document.addEventListener('input', (e) => {
    const c = (e.target as HTMLElement).closest<HTMLInputElement | HTMLSelectElement>('.panel-sonido [data-ps]');
    if (!c) return;
    const k = c.dataset.ps!;
    const v = Number(c.value) / 100;
    if (k === 'efectos' || k === 'musica') {
      const si = (c as HTMLInputElement).checked;
      cambiarAjustes(k === 'efectos' ? { efectos: si } : { musica: si });
      pintarPanel();
      panel?.querySelector<HTMLElement>(`[data-ps="${k}"]`)?.focus();
    } else if (k === 'volEfectos') cambiarAjustes({ volEfectos: v });
    else if (k === 'volMusica') cambiarAjustes({ volMusica: v });
    else if (k === 'pista') cambiarAjustes({ pista: c.value });
    else if (k === 'voz') {
      // Al elegirla, se oye, como el efecto de un momento
      elegirVozDelPanel(c.value || null);
      oirVoz(c.value || null, idiomaActual());
    }
  });
  // Al soltar el volumen de los efectos, se oye cómo queda
  document.addEventListener('change', (e) => {
    const c = (e.target as HTMLElement).closest<HTMLInputElement>('.panel-sonido [data-ps="volEfectos"]');
    if (c) probar(efectoDe('entendido', ajustes(), sonidosCargados()?.efectos ?? {}));
  });
  // Cuando llega la lista, el botón dice si hay sonidos en este computador
  void cargarSonidos().then(refrescarBotones);
}
