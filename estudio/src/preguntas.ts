// Las preguntas al director: el titular las anota cuando se le ocurren, sin cortar lo que está haciendo. Cada una se
// guarda al instante (una nota con sobre.tipo «pregunta»), igual que un comentario: se corrige o se quita hasta que el
// director la lea, y el director las responde todas juntas en su próxima revisión, como un informe (Studio › Preguntas),
// aparte de los comentarios y los pedidos. Grabada, como en todo el Studio: «Detener y revisar» deja oírla y añadirle
// otro fragmento, y «Enviar ya» la agrega de una vez.
import type { Nota } from '../../src/director/director';
import { Adjuntos } from './adjuntos';
import { Grabadora } from './grabadora';
import { icono } from './iconos';
import { esc } from './util';

export interface Manejadores {
  /** Las preguntas de quien usa el Studio que esperan respuesta, de la más vieja a la más nueva. */
  pendientes: () => Nota[];
  /** Cuántas preguntas ya respondió el director (para el botón «Ver las respuestas»). */
  respondidas: () => number;
  agregar: (texto: string, audio?: string, adjuntos?: { nombre: string; datos: string }[]) => Promise<boolean>;
  corregir: (id: string, texto: string) => Promise<boolean>;
  quitar: (id: string) => Promise<boolean>;
  verRespuestas: () => void;
  /** Una nota de voz: lo que se entendió (o «Transcribiendo…») y su audio; y lo adjunto, si lo hay. */
  audio: (n: Nota) => string;
  /** Lo que conviene saber al preguntar ahora (por ejemplo, que el director está revisando), en HTML; vacío si nada. */
  aviso?: () => string;
}

export function abrirPreguntas(m: Manejadores): Promise<void> {
  const dlg = document.createElement('dialog');
  dlg.className = 'dialogo-director preguntas-dialogo';
  document.body.append(dlg);
  let grabadora: Grabadora | null = null;
  let adjuntos: Adjuntos | null = null;
  let editando: string | null = null;
  let guardando = false;

  return new Promise((ok) => {
    let listo = false;
    const terminar = (luego?: () => void) => {
      if (listo) return;
      listo = true;
      window.removeEventListener('estudio:datos', refrescar);
      void grabadora?.terminar();
      adjuntos?.terminar();
      if (dlg.open) dlg.close();
      dlg.remove();
      luego?.();
      ok();
    };
    const error = (t: string) => {
      const e = dlg.querySelector<HTMLElement>('.error-explorador');
      if (e) e.textContent = t;
    };

    const item = (n: Nota, i: number) =>
      editando === n.id
        ? `<li class="editando"><span class="num-pregunta">${i + 1}</span><div class="cuerpo-pregunta"><textarea name="correccion" rows="2" aria-label="Corregir la pregunta">${esc(n.texto ?? '')}</textarea>
            <span class="acciones-pregunta"><button type="button" data-cancelar-correccion>Cancelar</button><button type="button" class="primario" data-guardar="${esc(n.id)}">Guardar</button></span></div></li>`
        : `<li><span class="num-pregunta">${i + 1}</span><div class="cuerpo-pregunta">${n.texto ? `<p>${esc(n.texto)}</p>` : ''}${n.audio || n.adjuntos?.length ? m.audio(n) : ''}
            <span class="acciones-pregunta">${n.texto ? `<button type="button" data-corregir="${esc(n.id)}">Corregir</button>` : ''}<button type="button" data-quitar="${esc(n.id)}">Quitar</button></span></div></li>`;
    const lista = () => {
      const n = m.pendientes();
      return `<h3>Esperando respuesta · ${n.length}</h3>${n.length ? `<ol class="lista-preguntas">${n.map(item).join('')}</ol>` : '<p class="como">Ninguna todavía. Escribe o graba abajo la primera.</p>'}`;
    };

    function pintar(enfocar = true) {
      const hechas = m.respondidas();
      const texto = dlg.querySelector<HTMLTextAreaElement>('textarea[name="pregunta"]')?.value ?? '';
      void grabadora?.terminar();
      dlg.innerHTML = `<form method="dialog" data-form="preguntas">
        <header class="cabeza-dialogo"><h2>${icono('pregunta', 'icono icono-titulo')} Preguntas para el director</h2>
          <p>Anótalas cuando se te ocurran, sin cortar lo que estás haciendo: cada una queda guardada al instante. El director las responde todas juntas, como un informe, en su próxima revisión. Hasta entonces, las corriges o las quitas.</p>${m.aviso?.() ? `<p class="aviso-revisando" role="status">${m.aviso()}</p>` : ''}</header>
        <section class="pendientes-preguntas" aria-label="Preguntas esperando respuesta">${lista()}</section>
        <div class="nueva-pregunta">
          <label class="campo"><span class="etiqueta-campo">Una pregunta más</span><textarea name="pregunta" rows="2" placeholder="Ej.: ¿Por qué el diagnóstico pone la seguridad antes que los pagos?">${esc(texto)}</textarea></label>
          <div class="fila-pregunta"><div class="grabadora" data-grabadora></div><button type="submit" class="primario">Agregar pregunta</button></div>
          <div class="adjuntos" data-adjuntos></div>
          <small class="ayuda-campo">Enter la agrega; Mayús + Enter, una línea nueva. Si la grabas, «Enviar ya» la agrega; «Detener y revisar» te deja oírla y añadirle algo. Una captura, antes de grabar o de oprimir Enter.</small>
        </div>
        <p class="error-explorador" role="alert"></p>
        <div class="botones"><button type="button" class="a-la-izquierda" data-ver>Ver las respuestas${hechas ? ` (${hechas})` : ''}</button><button type="button" data-cerrar>Listo</button></div>
      </form>`;
      grabadora = new Grabadora(dlg.querySelector('[data-grabadora]') as HTMLElement);
      // Se pega o se suelta en todo el diálogo, que no se repinta: un solo juego de adjuntos mientras esté abierto
      adjuntos = new Adjuntos(dlg.querySelector('[data-adjuntos]') as HTMLElement, dlg, error, adjuntos?.lista);
      if (enfocar) (dlg.querySelector<HTMLTextAreaElement>(editando ? 'textarea[name="correccion"]' : 'textarea[name="pregunta"]'))?.focus();
    }

    // Solo la lista se repinta (corregir, quitar, una transcripción que llega): lo que escribes o grabas abajo sigue intacto
    const pintarLista = () => {
      const seccion = dlg.querySelector('.pendientes-preguntas');
      if (seccion) seccion.innerHTML = lista();
      if (editando) dlg.querySelector<HTMLTextAreaElement>('textarea[name="correccion"]')?.focus();
    };
    const refrescar = () => {
      if (!editando) pintarLista();
    };
    window.addEventListener('estudio:datos', refrescar);

    dlg.addEventListener('keydown', (e) => {
      const t = e.target as HTMLElement;
      if (e.key !== 'Enter' || e.shiftKey || !(t instanceof HTMLTextAreaElement)) return;
      e.preventDefault();
      if (t.name === 'pregunta') t.form?.requestSubmit();
      else if (t.name === 'correccion') dlg.querySelector<HTMLButtonElement>('[data-guardar]')?.click();
    });
    dlg.addEventListener('click', async (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
      if (!b || b.disabled) return;
      const ds = b.dataset;
      if (ds.cerrar !== undefined) terminar();
      else if (ds.ver !== undefined) terminar(m.verRespuestas);
      else if (ds.corregir) {
        editando = ds.corregir;
        pintarLista();
      } else if (ds.cancelarCorreccion !== undefined) {
        editando = null;
        pintarLista();
      } else if (ds.guardar) {
        const t = dlg.querySelector<HTMLTextAreaElement>('textarea[name="correccion"]')!.value.trim();
        if (!t) return error('La pregunta quedó vacía: escríbela o quítala.');
        if (await m.corregir(ds.guardar, t)) {
          editando = null;
          pintarLista();
        }
      } else if (ds.quitar) {
        if (await m.quitar(ds.quitar)) pintarLista();
      }
    });
    dlg.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (guardando) return; // con «Enviar ya», el envío ya va en camino
      guardando = true;
      try {
        const campo = dlg.querySelector<HTMLTextAreaElement>('textarea[name="pregunta"]')!;
        const texto = campo.value.trim();
        const audio = (await grabadora?.datos()) ?? undefined;
        const archivos = adjuntos && !adjuntos.vacio ? await adjuntos.datos() : undefined;
        if (!texto && !audio && !archivos) return error('Escribe la pregunta, grábala o adjunta una imagen.');
        const boton = dlg.querySelector<HTMLButtonElement>('button[type="submit"]')!;
        boton.disabled = true;
        boton.textContent = 'Guardando…';
        error('');
        if (await m.agregar(texto, audio, archivos)) {
          // lista al día, campo vacío, sin adjuntos y una grabadora nueva para la siguiente
          campo.value = '';
          adjuntos?.terminar();
          boton.disabled = false;
          boton.textContent = 'Agregar pregunta';
          pintarLista();
          grabadora = new Grabadora(dlg.querySelector('[data-grabadora]') as HTMLElement);
          campo.focus();
        } else {
          boton.disabled = false;
          boton.textContent = 'Agregar pregunta';
        }
      } finally {
        guardando = false;
      }
    });
    dlg.addEventListener('cancel', () => terminar());
    // Si sigue abierto, solo se hizo a un lado para grabar (estudio/src/grabadora.ts)
    dlg.addEventListener('close', () => { if (!dlg.open) terminar(); });
    pintar(false);
    dlg.showModal();
    dlg.querySelector<HTMLTextAreaElement>('textarea[name="pregunta"]')?.focus();
  });
}
