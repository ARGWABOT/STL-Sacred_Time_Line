// El explorador de carpetas: para elegir el repositorio de un proyecto recorriendo las carpetas del computador, sin
// tener que escribir su ruta. Las carpetas las lista el servidor local del Estudio (el navegador no entrega rutas
// reales); las que son repositorios git se marcan. Devuelve la ruta elegida, o null si se cancela.
import { t } from './textos';
import { esc } from './util';

interface Carpeta { nombre: string; ruta: string; git: boolean }
interface Listado { ruta: string | null; padre: string | null; git: boolean; carpetas: Carpeta[]; inicios: Carpeta[] }

/** What the server answers about the system's folder dialog (estudio/servidor/dialogoCarpeta.ts). */
export type RespuestaDialogo = { estado: 'elegida'; ruta: string } | { estado: 'cancelada' } | { estado: 'sinDialogo'; avisar: boolean } | { estado: 'fallo'; error?: string };

/**
 * What «Browse…» does after the system's dialog (p_explorador_nativo): the chosen folder; nothing, if it was cancelled;
 * or the Studio's explorer, when the person asked for it, when this computer has no dialog (with its one-line notice
 * only the first time, nmws7mgxstit) or when the dialog could not open.
 */
export function trasElDialogo(r: RespuestaDialogo | { estado: 'explorador' }): { ruta: string } | null | { explorador: true; aviso: boolean } {
  if (r.estado === 'elegida') return { ruta: r.ruta };
  if (r.estado === 'cancelada') return null;
  return { explorador: true, aviso: r.estado === 'sinDialogo' && r.avisar };
}

/**
 * Every «Browse…» of the Studio comes here, the same way (nmws7la92tit): first the system's own folder dialog, opened
 * by the local server; while it is open, a line after the button says it may be behind the browser and offers «Use the
 * Studio's explorer», which cancels the request (and the server ends the dialog's process).
 */
export async function elegirCarpeta(inicial: string, boton: HTMLElement): Promise<string | null> {
  const siguiente = trasElDialogo(await delSistema(inicial, boton));
  if (!siguiente) return null;
  if ('ruta' in siguiente) return siguiente.ruta;
  return explorarEnElStudio(inicial, siguiente.aviso);
}

async function delSistema(inicial: string, boton: HTMLElement): Promise<RespuestaDialogo | { estado: 'explorador' }> {
  const corte = new AbortController();
  let pidioExplorador = false;
  const linea = document.createElement('p');
  linea.className = 'espera-dialogo';
  linea.setAttribute('role', 'status');
  linea.innerHTML = `${t('explorador.ventanaAbierta')} <button type="button" class="enlace" data-usar-explorador>${t('explorador.usarExplorador')}</button>`;
  linea.querySelector('button')!.addEventListener('click', () => {
    pidioExplorador = true;
    corte.abort();
  });
  (boton.closest('label') ?? boton.closest('.fila-form') ?? boton).after(linea);
  const b = boton as HTMLButtonElement;
  const estaba = b.disabled;
  b.disabled = true;
  try {
    const r = await fetch('/__estudio/director/dialogo-carpeta', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campo: inicial, titulo: t('explorador.tituloSistema') }), signal: corte.signal });
    if (!r.ok) return { estado: 'fallo' };
    return (await r.json()) as RespuestaDialogo;
  } catch {
    return pidioExplorador ? { estado: 'explorador' } : { estado: 'fallo' };
  } finally {
    linea.remove();
    b.disabled = estaba;
  }
}

/** The Studio's own explorer, the fallback. `aviso`: the one-line notice that this computer has no folder window. */
function explorarEnElStudio(inicial = '', aviso = false): Promise<string | null> {
  const dlg = document.createElement('dialog');
  dlg.className = 'dialogo-director explorador';
  document.body.append(dlg);
  let actual: Listado | null = null;
  let filtro = '';

  return new Promise((ok) => {
    // Se resuelve una sola vez y sin depender del evento «close» (no todos los navegadores lo disparan a tiempo)
    let listo = false;
    const terminar = (ruta: string | null) => {
      if (listo) return;
      listo = true;
      if (dlg.open) dlg.close();
      dlg.remove();
      ok(ruta);
    };

    async function abrir(ruta: string) {
      const r = await fetch(`/__estudio/director/carpetas?ruta=${encodeURIComponent(ruta)}`);
      const j = await r.json();
      if (!r.ok) {
        const e = dlg.querySelector<HTMLElement>('.error-explorador');
        if (e) e.textContent = j.error ?? t('explorador.noSePudoAbrir');
        return;
      }
      actual = j;
      filtro = '';
      pintar();
    }

    function pintar() {
      const a = actual!;
      const visibles = a.carpetas.filter((c) => !filtro || c.nombre.toLowerCase().includes(filtro.toLowerCase()));
      const repos = a.carpetas.filter((c) => c.git).length;
      dlg.innerHTML = `<form method="dialog">
        <h2>${t('explorador.titulo')}</h2>
        ${aviso ? `<p class="aviso-sin-dialogo" role="note">${t('explorador.sinDialogo')}</p>` : ''}
        <p>${t('explorador.intro')}</p>
        <div class="inicios-e">${a.inicios.map((i) => `<button type="button" data-abrir="${esc(i.ruta)}" title="${esc(i.ruta)}">${esc(i.nombre)}</button>`).join('')}</div>
        <div class="ruta-e">
          <button type="button" data-abrir="${esc(a.padre ?? '')}" ${a.padre ? '' : 'disabled'} title="${t('explorador.subir')}">↑</button>
          <input type="text" name="ruta" value="${esc(a.ruta ?? '')}" placeholder="${t('explorador.rutaPista')}" aria-label="${t('explorador.rutaAria')}" />
        </div>
        ${a.ruta ? `<div class="filtro-e"><input type="search" name="filtro" value="${esc(filtro)}" placeholder="${t('explorador.filtroPista', { n: a.carpetas.length })}" aria-label="${t('explorador.filtroAria')}" />${repos ? `<small>${t('explorador.reposAqui', { n: repos })}</small>` : ''}</div>` : ''}
        <ul class="carpetas-e">${a.ruta
          ? visibles.map((c) => `<li class="${c.git ? 'git' : ''}"><button type="button" class="entrar-e" data-abrir="${esc(c.ruta)}">📁 ${esc(c.nombre)}</button>${c.git ? `<span class="chip foco">git</span><button type="button" class="primario elegir-e" data-elegir="${esc(c.ruta)}">${t('explorador.elegir')}</button>` : ''}</li>`).join('') || `<li class="vacio-e">${t('explorador.sinSubcarpetas')}</li>`
          : `<li class="vacio-e">${t('explorador.elijaPunto')}</li>`}</ul>
        <p class="error-explorador" role="alert"></p>
        <div class="botones">
          <button type="button" data-cancelar>${t('cabeza.cancelar')}</button>
          <button type="button" class="primario" data-elegir="${esc(a.ruta ?? '')}" ${a.ruta ? '' : 'disabled'}>${a.git ? t('explorador.elegirRepo') : t('explorador.elegirCarpeta')}</button>
        </div>
      </form>`;
      const f = dlg.querySelector<HTMLInputElement>('input[name="filtro"]');
      if (f && filtro) { f.focus(); f.setSelectionRange(filtro.length, filtro.length); }
    }

    dlg.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
      if (!b) return;
      if (b.dataset.cancelar !== undefined) terminar(null);
      else if (b.dataset.elegir) terminar(b.dataset.elegir);
      else if (b.dataset.abrir) void abrir(b.dataset.abrir);
    });
    dlg.addEventListener('input', (e) => {
      const campo = e.target as HTMLInputElement;
      if (campo.name !== 'filtro') return;
      filtro = campo.value;
      pintar();
    });
    dlg.addEventListener('submit', (e) => {
      // Enter en la ruta: ir a esa carpeta
      e.preventDefault();
      const r = dlg.querySelector<HTMLInputElement>('input[name="ruta"]')?.value ?? '';
      if (r.trim()) void abrir(r);
    });
    dlg.addEventListener('cancel', () => terminar(null));
    dlg.addEventListener('close', () => terminar(null));

    actual = { ruta: null, padre: null, git: false, carpetas: [], inicios: [] };
    pintar();
    dlg.showModal();
    // Empieza donde ya hay algo escrito; si no, en los puntos de partida
    void abrir(inicial.trim()).then(() => { if (!actual?.ruta && inicial.trim()) void abrir(''); });
  });
}
