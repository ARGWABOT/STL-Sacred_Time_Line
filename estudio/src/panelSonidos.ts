/**
 * El control de los sonidos, en la cabecera junto al tema: un botón con su altavoz (tachado si los efectos están
 * apagados) que abre un panel pequeño, como el de un juego: «Efectos» y «Música», cada uno con su interruptor y su
 * volumen (la música, con su pista: solo las de fondo), y «Los sonidos de cada momento», un diálogo para elegir y oír el
 * efecto de cada momento. Sin la carpeta de los sonidos (estudio/sonidos), el panel lo dice en vez de los controles.
 */
import { icono } from './iconos';
import { anchoDeVentana, rectaEnPagina } from './escala';
import { esc } from './util';
import { ajustes, cambiarAjustes, cargarSonidos, efectoDe, efectoDeSiempre, MOMENTOS, pistasDeFondo, probar, sonidosCargados, type Momento } from './sonidos';
import { elegirVoz, oirVoz, sinVozAhora, vocesNaturalesDeLectura, vozElegida } from './guiaLectura';
import { activarSelectoresLista, htmlSelectorLista, type SelectorLista } from './selectorLista';
import { vozPorDefecto, type VozNatural } from '../../src/director/voz';

export const botonSonido = () => {
  const a = ajustes();
  const sin = sonidosCargados() === null;
  const apagados = sin || !a.efectos;
  const titulo = sin ? 'No hay sonidos en este computador' : `Sonidos: efectos ${a.efectos ? 'encendidos' : 'apagados'}, música ${a.musica ? 'encendida' : 'apagada'}`;
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

/** Las voces de Kokoro instaladas en el idioma del texto: undefined mientras se buscan; vacía si no hay ninguna. */
let naturales: VozNatural[] | undefined;

/**
 * La voz que lee con la niebla (pd_voz_alta: elegirla y escucharla en «Sonidos»): las de Kokoro de este computador, en el
 * idioma del texto, con ▶ para oír una frase (decisión del titular, 26 de octubre de 2026, nota de voz nmvpdu9zqtit: son
 * las únicas). Se guarda en este navegador; sin elegir, lee la de por defecto. Sin ninguna instalada, dice que Kokoro no
 * está instalado y cómo instalarlo, en vez de un selector vacío.
 */
function grupoVoz(): string {
  const titulo = '<b>Voz de la niebla</b>';
  if (naturales === undefined) return `<div class="ps-grupo">${titulo}<p class="ps-nota">Buscando las voces…</p></div>`;
  if (!naturales.length) return `<div class="ps-grupo">${titulo}<p class="ps-nota">${esc(sinVozAhora())}</p></div>`;
  const elegida = vozElegida();
  const actual = naturales.some((v) => v.id === elegida) ? elegida : '';
  // Sin elegir, lee la de por defecto del idioma (o la primera de él)
  const defecto = vozPorDefecto(naturales[0].idioma, naturales);
  const opcion = (v: VozNatural) => `<option value="${esc(v.id)}"${v.id === actual ? ' selected' : ''}>${esc(v.nombre)}</option>`;
  return `<div class="ps-grupo">${titulo}
      <span class="ps-fila ps-vol ps-voz"><select data-ps="voz" aria-label="La voz de Kokoro que lee con la niebla"><option value=""${actual ? '' : ' selected'}>${esc(`Automática (${defecto?.nombre ?? 'ninguna'})`)}</option>${naturales.map(opcion).join('')}</select>
      <button type="button" class="boton-suave" data-ps-oir-voz aria-label="Oír la voz elegida" title="Oírla">▶</button></span>
      <p class="ps-nota">Voces de Kokoro, locales: no sale nada de este computador. Lee con la niebla puesta, cuando enciendes el botón de la voz (la persona que habla). Se guarda una voz por idioma.</p>
    </div>`;
}

function contenido(): string {
  return compacto ? contenidoSonidos(false) : contenidoSonidos() + grupoVoz();
}

function contenidoSonidos(conMomentos = true): string {
  const l = sonidosCargados();
  if (l === undefined) return '<p class="ps-nota">Buscando los sonidos…</p>';
  if (!l) return '<p class="ps-nota"><b>No hay sonidos en este computador.</b> Vienen con el Studio, en la carpeta estudio/sonidos: si falta, queda en silencio.</p>';
  const a = ajustes();
  const pistas = pistasDeFondo(l);
  return `<div class="ps-grupo">
      <label class="ps-fila"><input type="checkbox" data-ps="efectos"${a.efectos ? ' checked' : ''}><b>Efectos</b></label>
      <label class="ps-fila ps-vol"><span>Volumen</span><input type="range" min="0" max="100" step="5" value="${pct(a.volEfectos)}" data-ps="volEfectos" aria-label="Volumen de los efectos"${a.efectos ? '' : ' disabled'}></label>
    </div>
    <div class="ps-grupo">
      <label class="ps-fila"><input type="checkbox" data-ps="musica"${a.musica ? ' checked' : ''}${pistas.length ? '' : ' disabled'}><b>Música</b></label>
      <label class="ps-fila ps-vol"><span>Volumen</span><input type="range" min="0" max="100" step="5" value="${pct(a.volMusica)}" data-ps="volMusica" aria-label="Volumen de la música"${a.musica ? '' : ' disabled'}></label>
      <label class="ps-fila ps-vol"><span>Pista</span><select data-ps="pista" aria-label="Pista de la música">${pistas.map(([id, m]) => `<option value="${esc(id)}"${id === a.pista ? ' selected' : ''}>${esc(m.nombre)}</option>`).join('')}</select></label>
    </div>
    ${conMomentos ? '<button type="button" class="boton-suave ps-momentos" data-ps-momentos>Los sonidos de cada momento</button>' : ''}`;
}

function pintarPanel() {
  if (panel) panel.innerHTML = contenido();
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
  panel.setAttribute('aria-label', 'Los sonidos del Studio');
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
    void vocesNaturalesDeLectura().then((n) => {
      naturales = n;
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
      nombre: m.nombre,
      valor: efectoDe(m.id, a, l.efectos),
      opciones: nombres.map((n) => ({ valor: n, texto: `${n}${n === deSiempre ? ' (el de siempre)' : ''}` })),
    };
  });
  const dlg = document.createElement('dialog');
  dlg.className = 'dialogo-director dialogo-sonidos';
  dlg.innerHTML = `<form method="dialog">
    <h2>Los sonidos de cada momento</h2>
    <p class="ayuda">Elige el efecto de cada momento y óyelo con ▶. Se guarda en este navegador.</p>
    <ul class="lista-momentos">${MOMENTOS.map((m, i) => `<li><label for="snd-${m.id}">${esc(m.nombre)}</label>
        <span class="ps-elegir">${htmlSelectorLista(selectores[i])}
        <button type="button" class="boton-suave" data-oir="${m.id}" aria-label="Oír el sonido de «${esc(m.nombre)}»" title="Oírlo">▶</button></span></li>`).join('')}</ul>
    <div class="botones"><button type="submit" class="primario">Cerrar</button></div>
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
    const t = e.target as HTMLElement;
    const b = t.closest<HTMLElement>('[data-sonido]');
    if (b) {
      if (panel) cerrarPanel(botones().indexOf(b));
      else abrirPanel(b);
      return;
    }
    if (t.closest('[data-ps-momentos]')) return abrirMomentos();
    if (t.closest('[data-ps-oir-voz]')) return oirVoz(vozElegida());
    if (panel && !t.closest('.panel-sonido')) cerrarPanel();
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
      elegirVoz(c.value || null);
      oirVoz(c.value || null);
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
