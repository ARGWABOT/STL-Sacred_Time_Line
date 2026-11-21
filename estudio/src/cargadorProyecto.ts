/**
 * Mientras se cambia de proyecto (nota del titular nmw9wgco4tit, 9 de noviembre de 2026: «hace falta un loader para la
 * transición entre un proyecto y el otro»): una capa sobre la sección, con su círculo que gira y el nombre del proyecto
 * que se abre, hasta que llegan sus datos. Puro, para probarlo sin la página.
 */
import { t as tx } from './textos';
import { esc } from './util';

export function cargadorProyecto(nombre: string | null, esperaNota = false): string {
  const texto = nombre ? tx('proyectos.abriendo', { nombre: esc(nombre) }) : tx('proyectos.abriendoOtro');
  // Con una nota de voz del proyecto de ahora transcribiéndose, el cambio la espera y lo dice (nmwdwg5yvtit)
  return `<div class="cambiando-proyecto" role="status" aria-live="polite" data-cambiando-proyecto>
    <div class="pt-orbita" aria-hidden="true"></div>
    <p>${texto}</p>${esperaNota ? `\n    <p data-espera-nota>${tx('notas.cambioEspera')}</p>` : ''}
  </div>`;
}
