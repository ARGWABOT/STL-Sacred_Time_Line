// Los adjuntos de una nota: pegar una imagen con Ctrl+V en el cuadro de texto, arrastrarla o elegir cualquier archivo
// con «Adjuntar». Se ven en miniatura (las imágenes) o con su nombre, cada uno con su botón para quitarlo, y viajan con
// la nota como data URL al servidor local, que los guarda en la memoria del proyecto junto a los audios
// (director/notas/adjuntos/). La bandeja le da al director la ruta de cada uno y él los abre.
//
// Lo que entra a la historia de git se queda: 10 MB por archivo como mucho, y antes de adjuntar algo grande se pregunta.
import { MAX_ADJUNTO, MAX_ADJUNTOS } from '../../src/director/director';
import { icono } from './iconos';
import { confirmar } from './modal';
import { esc } from './util';

/** Desde cuánto se pregunta antes de adjuntar (pesa en la historia del proyecto para siempre). */
const GRANDE = 2 * 1024 * 1024;
const peso = (b: number) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);

const comoDataURL = (f: File) =>
  new Promise<string>((ok, mal) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result));
    r.onerror = () => mal(r.error);
    r.readAsDataURL(f);
  });

/**
 * Una imagen en grande, encima de todo (también del diálogo donde se está comentando): para confirmar que es la que se
 * quiere enviar. Se cierra con un clic, con «Cerrar» o con Esc, y se vuelve al diálogo tal como estaba.
 */
export function verEnGrande(url: string, nombre: string) {
  const dlg = document.createElement('dialog');
  dlg.className = 'imagen-grande';
  dlg.innerHTML = `<figure><img src="${url}" alt="${esc(nombre)}"><figcaption>${esc(nombre)}</figcaption></figure><button type="button" class="cerrar-grande">${icono('cerrar')} Cerrar</button>`;
  document.body.append(dlg);
  dlg.addEventListener('click', () => dlg.close());
  // Su Esc solo la cierra a ella, no el diálogo de abajo
  dlg.addEventListener('cancel', (e) => {
    e.preventDefault();
    dlg.close();
  });
  dlg.addEventListener('close', () => dlg.remove());
  dlg.showModal();
}

export class Adjuntos {
  private archivos: File[];
  private static urls = new Map<File, string>();

  /**
   * `caja`: donde se pintan el botón y las miniaturas. `zona`: donde se puede pegar y soltar (el formulario o el diálogo).
   * `avisar`: para decir por qué un archivo no entró. `previos`: lo ya adjuntado, si la caja se volvió a pintar.
   */
  constructor(private readonly caja: HTMLElement, zona: HTMLElement, private readonly avisar: (texto: string) => void, previos: File[] = []) {
    this.archivos = [...previos];
    this.pintar();
    zona.addEventListener('paste', (e) => {
      const files = [...(e.clipboardData?.files ?? [])];
      if (!files.length) return; // texto: se pega como siempre
      e.preventDefault();
      void this.agregar(files.map((f, i) => (f.name && f.name !== 'image.png' ? f : new File([f], `captura-${Date.now()}${files.length > 1 ? `-${i + 1}` : ''}.${(f.type.split('/')[1] ?? 'png').replace('jpeg', 'jpg')}`, { type: f.type }))));
    });
    zona.addEventListener('dragover', (e) => {
      if (!e.dataTransfer?.types.includes('Files')) return;
      e.preventDefault();
      zona.classList.add('soltando');
    });
    zona.addEventListener('dragleave', (e) => {
      if (!zona.contains(e.relatedTarget as Node | null)) zona.classList.remove('soltando');
    });
    zona.addEventListener('drop', (e) => {
      zona.classList.remove('soltando');
      const files = [...(e.dataTransfer?.files ?? [])];
      if (!files.length) return;
      e.preventDefault();
      void this.agregar(files);
    });
  }

  get vacio() {
    return !this.archivos.length;
  }

  get lista(): File[] {
    return [...this.archivos];
  }

  private async agregar(files: File[]) {
    for (const f of files) {
      if (this.archivos.length >= MAX_ADJUNTOS) return this.avisar(`Una nota lleva como mucho ${MAX_ADJUNTOS} adjuntos.`);
      if (f.size > MAX_ADJUNTO) {
        this.avisar(`«${f.name}» pesa ${peso(f.size)}: el límite es ${peso(MAX_ADJUNTO)} por archivo.`);
        continue;
      }
      if (!f.size) continue;
      if (f.size > GRANDE && !(await confirmar({ titulo: `¿Adjuntar «${f.name}» (${peso(f.size)})?`, texto: 'Queda en la historia del proyecto para siempre, aunque después borres la nota. Si es una captura, recórtala a lo que importa.', boton: 'Adjuntarlo' }))) continue;
      this.archivos.push(f);
    }
    this.pintar();
  }

  private pintar() {
    const urls = Adjuntos.urls;
    const miniatura = (f: File, i: number) => {
      const imagen = /^image\/(png|jpeg|gif|webp)$/.test(f.type);
      if (imagen && !urls.has(f)) urls.set(f, URL.createObjectURL(f));
      return `<li class="adjunto${imagen ? ' imagen' : ''}" title="${esc(`${f.name} · ${peso(f.size)}`)}">
        ${imagen ? `<button type="button" class="ver-adjunto" data-ver-adjunto="${i}" title="Verla en grande, para confirmar que es la correcta"><img src="${urls.get(f)}" alt="${esc(f.name)}"></button>` : `<span class="nombre-adjunto">${icono('clip')}${esc(f.name)}</span>`}
        <button type="button" class="quitar-adjunto" data-quitar-adjunto="${i}" aria-label="Quitar ${esc(f.name)}">${icono('cerrar')}</button></li>`;
    };
    this.caja.innerHTML = `${this.archivos.length ? `<ul class="lista-adjuntos">${this.archivos.map(miniatura).join('')}</ul>` : ''}
      <label class="boton-adjuntar">${icono('clip')} Adjuntar<input type="file" multiple hidden></label>
      <span class="ayuda-g">o pega una imagen con Ctrl+V, o arrástrala aquí</span>`;
    this.caja.querySelector<HTMLInputElement>('input[type="file"]')!.addEventListener('change', (e) => {
      const input = e.target as HTMLInputElement;
      void this.agregar([...(input.files ?? [])]);
      input.value = '';
    });
    this.caja.querySelectorAll<HTMLButtonElement>('[data-quitar-adjunto]').forEach((b) =>
      b.addEventListener('click', () => {
        Adjuntos.soltar(this.archivos.splice(Number(b.dataset.quitarAdjunto), 1));
        this.pintar();
      }),
    );
    this.caja.querySelectorAll<HTMLButtonElement>('[data-ver-adjunto]').forEach((b) =>
      b.addEventListener('click', () => {
        const f = this.archivos[Number(b.dataset.verAdjunto)];
        if (f) verEnGrande(urls.get(f)!, f.name);
      }),
    );
  }

  /** Lo que viaja con la nota. */
  async datos(): Promise<{ nombre: string; datos: string }[]> {
    return Promise.all(this.archivos.map(async (f) => ({ nombre: f.name, datos: await comoDataURL(f) })));
  }

  /** Suelta las miniaturas (al cerrar el diálogo o al enviar). */
  terminar() {
    Adjuntos.soltar(this.archivos);
    this.archivos = [];
    this.pintar();
  }

  private static soltar(files: File[]) {
    for (const f of files) {
      const u = Adjuntos.urls.get(f);
      if (u) URL.revokeObjectURL(u);
      Adjuntos.urls.delete(f);
    }
  }
}
