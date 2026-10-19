// Las confirmaciones del Studio: un modal propio, con el mismo aspecto de los demás diálogos, en vez del cuadro del
// navegador. Los avisos que no piden respuesta van en el aviso flotante (director.ts › avisar).
import { esc } from './util';

/** Pregunta algo que hay que confirmar. Devuelve true si se acepta; false si se cancela (o con Esc). */
export function confirmar(o: { titulo: string; texto?: string; boton: string; cancelar?: string; peligro?: boolean }): Promise<boolean> {
  const dlg = document.createElement('dialog');
  dlg.className = 'dialogo-director confirmar';
  dlg.innerHTML = `<form method="dialog">
    <header class="cabeza-dialogo"><h2>${esc(o.titulo)}</h2>${o.texto ? `<p>${esc(o.texto).replace(/\n/g, '<br>')}</p>` : ''}</header>
    <div class="botones"><button type="button" data-no>${esc(o.cancelar ?? 'Cancelar')}</button><button type="submit" class="${o.peligro ? 'peligro' : 'primario'}">${esc(o.boton)}</button></div>
  </form>`;
  document.body.append(dlg);
  return new Promise((ok) => {
    let listo = false;
    const terminar = (si: boolean) => {
      if (listo) return;
      listo = true;
      if (dlg.open) dlg.close();
      dlg.remove();
      ok(si);
    };
    dlg.querySelector('[data-no]')!.addEventListener('click', () => terminar(false));
    dlg.querySelector('form')!.addEventListener('submit', (e) => {
      e.preventDefault();
      terminar(true);
    });
    dlg.addEventListener('cancel', () => terminar(false));
    dlg.addEventListener('close', () => terminar(false));
    dlg.showModal();
    dlg.querySelector<HTMLButtonElement>('button[type="submit"]')?.focus();
  });
}
