// La página de la pestaña de QA, en el navegador (pd_pestana_qa; nmwplyqprtit, nmwpnvo38tit): «Tomar fotonota» congela la
// vista, deja rayarla en rojo mientras se graba lo que se dice (capturaQa.ts › fotonota) y manda al Buzón del proyecto
// el audio con sus fotos, ligado al paso que abrió la pestaña y a la página. Solo voz: la fotonota no lleva texto.
import { fotonota, congelarVista } from './capturaQa';
import { enDatos } from './grabadora';
import { ponerIdioma, t as tx } from './textos';
import { esIdioma } from '../../src/director/idioma';
import { RUTA_NOTA_QA, TIPO_FOTONOTA } from './qa';

const datos = JSON.parse(document.getElementById('qa-datos')?.textContent ?? '{}') as { proyecto: string; mision: string; paso: number; pasoTexto: string };
const idioma = document.documentElement.lang;
if (esIdioma(idioma)) ponerIdioma(idioma);

const director = document.querySelector<HTMLElement>('[data-qa-director]')!;
const estado = director.querySelector<HTMLElement>('[data-qa-estado]')!;
const marco = document.querySelector<HTMLIFrameElement>('[data-qa-marco]');

/** La página de la aplicación donde está la persona (la del marco, si se deja leer). */
function pagina() {
  try {
    return marco?.contentWindow?.location.href ?? location.href;
  } catch {
    return marco?.src ?? location.href;
  }
}

director.querySelector('[data-qa-captura]')?.addEventListener('click', async () => {
  estado.textContent = '';
  const donde = pagina();
  // La ventana entera, con el contorno del teléfono o la tableta, y la nota dice cuál era (nmwppyi02tit); sin la línea del aviso
  const dispositivo = document.documentElement.getAttribute('data-qa-dispositivo') ?? 'escritorio';
  const aviso = document.querySelector<HTMLElement>('[data-qa-aviso]');
  const vista = await congelarVista(aviso ? [director, aviso] : [director]);
  if (!vista) return void (estado.textContent = tx('qa.capturaNo'));
  director.hidden = true;
  const mandada = await fotonota(vista, async ({ audio, fotos }) => {
    const adjuntos = await Promise.all(fotos.map(async (f) => ({ nombre: f.name, datos: await enDatos(f) })));
    const res = await fetch(RUTA_NOTA_QA, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proyecto: datos.proyecto, mision: datos.mision, paso: datos.paso, pagina: donde, dispositivo, texto: '', tipoNota: TIPO_FOTONOTA, audio, adjuntos }),
    }).catch(() => null);
    return !!res?.ok;
  });
  director.hidden = false;
  if (mandada) estado.textContent = tx('qa.enviada');
});
