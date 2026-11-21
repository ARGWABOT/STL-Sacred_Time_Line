// La ventana que pide tu nombre y tu correo de git una vez, en cuanto se abre el Studio, si su carpeta no los tiene
// (pedido pd_sin_modo_equipo; decisiones nmwds81gbtit y nmwfln1gatit). Se guardan con git config en esa carpeta
// (api.ts › /identidad) y el Studio firma con ellos cada decisión. Con identidad, nunca se abre.
import { esc } from './util';
import { t } from './textos';

/** ¿Hay que pedirla? Solo si falta el nombre o el correo. Pura. */
export const faltaIdentidad = (id: { nombre?: string; correo?: string } | null | undefined): boolean => !!id && (!id.nombre?.trim() || !id.correo?.trim());

/** El contenido de la ventana. Pura. */
export function htmlVentanaIdentidad(previo: { nombre?: string; correo?: string } = {}): string {
  return `<form method="dialog" class="form-identidad">
    <header class="cabeza-dialogo"><h2>${t('identidad.titulo')}</h2><p>${t('identidad.explica')}</p></header>
    <label>${t('identidad.nombre')} <input type="text" name="nombre" autocomplete="name" maxlength="120" required value="${esc(previo.nombre ?? '')}"></label>
    <label>${t('identidad.correo')} <input type="email" name="correo" autocomplete="email" maxlength="200" required value="${esc(previo.correo ?? '')}"></label>
    <p class="aviso remoto" data-error hidden></p>
    <div class="botones"><button type="button" data-no>${t('identidad.despues')}</button><button type="submit" class="primario">${t('identidad.guardar')}</button></div>
  </form>`;
}

let pedida = false;

/**
 * La abre una sola vez por página, si falta la identidad. `guardar` la manda al servidor y devuelve el error a mostrar, o
 * null si quedó guardada; `listo` se llama al guardarla (la página vuelve a cargar los datos).
 */
export function pedirIdentidadSiFalta(id: { nombre?: string; correo?: string } | null | undefined, guardar: (nombre: string, correo: string) => Promise<string | null>, listo: () => void): void {
  if (pedida || !faltaIdentidad(id)) return;
  pedida = true;
  const dlg = document.createElement('dialog');
  dlg.className = 'dialogo-director ventana-identidad';
  dlg.innerHTML = htmlVentanaIdentidad(id ?? {});
  document.body.append(dlg);
  const form = dlg.querySelector('form')!;
  const error = dlg.querySelector<HTMLElement>('[data-error]')!;
  const cerrar = () => {
    if (dlg.open) dlg.close();
    dlg.remove();
  };
  dlg.querySelector('[data-no]')?.addEventListener('click', cerrar);
  dlg.addEventListener('cancel', cerrar);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const datos = new FormData(form);
    const boton = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    boton.disabled = true;
    const fallo = await guardar(String(datos.get('nombre') ?? ''), String(datos.get('correo') ?? ''));
    boton.disabled = false;
    if (fallo) {
      error.textContent = fallo;
      error.hidden = false;
      return;
    }
    cerrar();
    listo();
  });
  dlg.showModal();
  dlg.querySelector<HTMLInputElement>('input[name="nombre"]')?.focus();
}

/** Lo que hace la página: manda el nombre y el correo a /identidad y devuelve el error, si lo hay. */
export async function guardarIdentidadEnElServidor(nombre: string, correo: string): Promise<string | null> {
  try {
    const r = await fetch('/__estudio/director/identidad', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre, correo }) });
    const j = await r.json().catch(() => ({}));
    return r.ok ? null : (j.error ?? t('identidad.correoMal'));
  } catch (e) {
    return (e as Error).message;
  }
}
