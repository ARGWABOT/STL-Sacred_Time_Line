// El explorador de carpetas: para elegir el repositorio de un proyecto recorriendo las carpetas del computador, sin
// tener que escribir su ruta. Las carpetas las lista el servidor local del Estudio (el navegador no entrega rutas
// reales); las que son repositorios git se marcan. Devuelve la ruta elegida, o null si se cancela.
import { esc } from './util';

interface Carpeta { nombre: string; ruta: string; git: boolean }
interface Listado { ruta: string | null; padre: string | null; git: boolean; carpetas: Carpeta[]; inicios: Carpeta[] }

export function elegirCarpeta(inicial = ''): Promise<string | null> {
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
        if (e) e.textContent = j.error ?? 'No se pudo abrir esa carpeta.';
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
        <h2>Elige la carpeta del repositorio</h2>
        <p>Entra a las carpetas hasta llegar a la del proyecto. Las que dicen <span class="chip foco">git</span> son repositorios: elígelas directamente.</p>
        <div class="inicios-e">${a.inicios.map((i) => `<button type="button" data-abrir="${esc(i.ruta)}" title="${esc(i.ruta)}">${esc(i.nombre)}</button>`).join('')}</div>
        <div class="ruta-e">
          <button type="button" data-abrir="${esc(a.padre ?? '')}" ${a.padre ? '' : 'disabled'} title="Subir a la carpeta de arriba">↑</button>
          <input type="text" name="ruta" value="${esc(a.ruta ?? '')}" placeholder="Elige un punto de partida o escribe una ruta y oprime Enter" aria-label="Carpeta actual" />
        </div>
        ${a.ruta ? `<div class="filtro-e"><input type="search" name="filtro" value="${esc(filtro)}" placeholder="Filtrar las ${a.carpetas.length} carpetas…" aria-label="Filtrar" />${repos ? `<small>${repos} ${repos === 1 ? 'repositorio' : 'repositorios'} aquí</small>` : ''}</div>` : ''}
        <ul class="carpetas-e">${a.ruta
          ? visibles.map((c) => `<li class="${c.git ? 'git' : ''}"><button type="button" class="entrar-e" data-abrir="${esc(c.ruta)}">📁 ${esc(c.nombre)}</button>${c.git ? `<span class="chip foco">git</span><button type="button" class="primario elegir-e" data-elegir="${esc(c.ruta)}">Elegir</button>` : ''}</li>`).join('') || '<li class="vacio-e">Sin subcarpetas.</li>'
          : '<li class="vacio-e">Elige un punto de partida arriba.</li>'}</ul>
        <p class="error-explorador" role="alert"></p>
        <div class="botones">
          <button type="button" data-cancelar>Cancelar</button>
          <button type="button" class="primario" data-elegir="${esc(a.ruta ?? '')}" ${a.ruta ? '' : 'disabled'}>${a.git ? 'Elegir este repositorio' : 'Elegir esta carpeta'}</button>
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
      const t = e.target as HTMLInputElement;
      if (t.name !== 'filtro') return;
      filtro = t.value;
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
