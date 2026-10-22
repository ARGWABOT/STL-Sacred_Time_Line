/**
 * El control de los sonidos, en la cabecera junto al tema: un botón con su altavoz (tachado si los efectos están
 * apagados) que abre un panel pequeño, como el de un juego: «Efectos» y «Música», cada uno con su interruptor y su
 * volumen (la música, con su pista: solo las de fondo), y «Los sonidos de cada momento», un diálogo para elegir y oír el
 * efecto de cada momento. Sin la carpeta de AdWi en este computador, el panel lo dice en vez de los controles.
 */
import { icono } from './iconos';
import { esc } from './util';
import { ajustes, cambiarAjustes, cargarSonidos, efectoDe, efectoDeSiempre, MOMENTOS, pistasDeFondo, probar, sonidosCargados, type Momento } from './sonidos';

export const botonSonido = () => {
  const a = ajustes();
  const sin = sonidosCargados() === null;
  const apagados = sin || !a.efectos;
  const titulo = sin ? 'No hay sonidos en este computador' : `Sonidos: efectos ${a.efectos ? 'encendidos' : 'apagados'}, música ${a.musica ? 'encendida' : 'apagada'}`;
  return `<button type="button" class="boton-suave boton-tema boton-sonido${apagados ? ' apagado' : ''}" data-sonido aria-haspopup="true" aria-expanded="${!!panel}" title="${esc(titulo)}" aria-label="${esc(titulo)}">${icono(apagados ? 'silencio' : 'altavoz')}</button>`;
};

let panel: HTMLElement | null = null;

const pct = (v: number) => Math.round(v * 100);

function contenido(): string {
  const l = sonidosCargados();
  if (l === undefined) return '<p class="ps-nota">Buscando los sonidos…</p>';
  if (!l) return '<p class="ps-nota"><b>No hay sonidos en este computador.</b> El Studio usa los de AdWi, que no van en el repositorio: si su carpeta no está, queda en silencio.</p>';
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
    <button type="button" class="boton-suave ps-momentos" data-ps-momentos>Los sonidos de cada momento</button>`;
}

function pintarPanel() {
  if (panel) panel.innerHTML = contenido();
}

/** El panel, bajo su botón; se cierra con otro clic en el botón, fuera de él o con Esc. */
function abrirPanel(b: HTMLElement) {
  panel = document.createElement('div');
  panel.className = 'panel-sonido';
  panel.setAttribute('role', 'group');
  panel.setAttribute('aria-label', 'Los sonidos del Studio');
  document.body.append(panel);
  const r = b.getBoundingClientRect();
  panel.style.top = `${Math.round(r.bottom + 6)}px`;
  panel.style.right = `${Math.max(8, Math.round(window.innerWidth - r.right))}px`;
  pintarPanel();
  void cargarSonidos().then(pintarPanel);
  b.setAttribute('aria-expanded', 'true');
  panel.querySelector<HTMLElement>('input, select, button')?.focus();
}

function cerrarPanel() {
  panel?.remove();
  panel = null;
  refrescarBotones();
}

function refrescarBotones() {
  document.querySelectorAll<HTMLElement>('[data-sonido]').forEach((x) => (x.outerHTML = botonSonido()));
}

/** El diálogo de cada momento: su efecto (de la lista de AdWi) y ▶ para oírlo. */
function abrirMomentos() {
  const l = sonidosCargados();
  if (!l) return;
  cerrarPanel();
  const a = ajustes();
  const nombres = Object.keys(l.efectos).sort();
  const dlg = document.createElement('dialog');
  dlg.className = 'dialogo-director dialogo-sonidos';
  dlg.innerHTML = `<form method="dialog">
    <h2>Los sonidos de cada momento</h2>
    <p class="ayuda">Elige el efecto de cada momento y óyelo con ▶. Se guarda en este navegador.</p>
    <ul class="lista-momentos">${MOMENTOS.map((m) => {
      const actual = efectoDe(m.id, a, l.efectos);
      const deSiempre = efectoDeSiempre(m.id, l.efectos);
      return `<li><label for="snd-${m.id}">${esc(m.nombre)}</label>
        <span class="ps-elegir"><select id="snd-${m.id}" data-momento="${m.id}">${nombres.map((n) => `<option value="${esc(n)}"${n === actual ? ' selected' : ''}>${esc(n)}${n === deSiempre ? ' (el de siempre)' : ''}</option>`).join('')}</select>
        <button type="button" class="boton-suave" data-oir="${m.id}" aria-label="Oír el sonido de «${esc(m.nombre)}»" title="Oírlo">▶</button></span></li>`;
    }).join('')}</ul>
    <div class="botones"><button type="submit" class="primario">Cerrar</button></div>
  </form>`;
  document.body.append(dlg);
  dlg.addEventListener('change', (e) => {
    const s = (e.target as HTMLElement).closest<HTMLSelectElement>('[data-momento]');
    if (!s) return;
    const m = s.dataset.momento as Momento;
    const original = efectoDeSiempre(m, l.efectos);
    const elegidos = { ...ajustes().elegidos };
    if (s.value === original) delete elegidos[m];
    else elegidos[m] = s.value;
    cambiarAjustes({ elegidos });
    probar(s.value);
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
      if (panel) cerrarPanel();
      else abrirPanel(b);
      return;
    }
    if (t.closest('[data-ps-momentos]')) return abrirMomentos();
    if (panel && !t.closest('.panel-sonido')) cerrarPanel();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !panel) return;
    cerrarPanel();
    document.querySelector<HTMLElement>('[data-sonido]')?.focus();
  });
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
  });
  // Al soltar el volumen de los efectos, se oye cómo queda
  document.addEventListener('change', (e) => {
    const c = (e.target as HTMLElement).closest<HTMLInputElement>('.panel-sonido [data-ps="volEfectos"]');
    if (c) probar(efectoDe('entendido', ajustes(), sonidosCargados()?.efectos ?? {}));
  });
  // Cuando llega la lista, el botón dice si hay sonidos en este computador
  void cargarSonidos().then(refrescarBotones);
}
