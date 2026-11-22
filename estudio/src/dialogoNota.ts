// El diálogo común de las notas (el ✉ y los demás que piden algo), aparte de app.ts para que el Studio y la pestaña de QA
// usen el mismo código (pd_pestana_qa; nota del titular nmwplyqprtit): grabar por partes, añadir otro audio, pegar
// imágenes, el tipo de nota de un toque y su borrador, con el estilo del Studio. Lo que depende de la página que lo abre
// (sus avisos, la urgencia, el explorador de carpetas) llega en su contexto (ponerContextoDelDialogo).
import { antesDeOtroSobre, Grabadora } from './grabadora';
import { Adjuntos } from './adjuntos';
import { archivoDeAdjunto, guardarBorrador, leerBorrador, quitarBorrador, type SobreBorrador } from './borradores';
import { CLAVE_ENVIAR_NOTA, contenidoDelBoton, crearCargadores, lineaDelCargador } from './cargador';
import { icono } from './iconos';
import { esc } from './util';
import { t as tx } from './textos';
import { nombreTipoEnBuzon } from './vistaBuzon';
import { OPCIONES_TIPO_DE_NOTA, TIPO_ELIGE } from '../../src/director/director';

/**
 * El tipo de la nota, obligatorio y de un toque (pedido pd_tipo_obligatorio): con qué intención la escribes, para que el
 * director la lea así y el Buzón la filtre. Sin otro marcado (el ✉ de un lugar ya trae «Comentario»), parte en «Auto», el
 * primero (nmvsyxjd6tit).
 */
export function campoTipo(valor: string = TIPO_ELIGE): Campo {
  return { id: 'tipoNota', etiqueta: tx('buzon.queEsNota'), tipo: 'botones', clase: 'campo-tipo', requerido: true, opciones: OPCIONES_TIPO_DE_NOTA.map(([v]) => [v, nombreTipoEnBuzon(v)]), valor, ayuda: tx('buzon.queEsAyuda') };
}

/** `explorar`: el campo es una carpeta, con su botón para buscarla en el computador. */
/** `casillas`: varias opciones que se marcan, cada una con su casilla; llegan juntas, separadas por comas. */
export interface Campo { id: string; etiqueta: string; tipo: 'area' | 'texto' | 'select' | 'casillas' | 'botones'; opciones?: [string, string][]; requerido?: boolean; valor?: string; explorar?: boolean; clase?: string; ayuda?: string; pista?: string }

export type Dicho = Record<string, string> & { audio?: string; adjuntos?: { nombre: string; datos: string }[]; quitarAdjuntos?: string[] };

/** Un adjunto que ya tiene la nota que se corrige (con su casilla para quitarlo). */
export interface AdjuntoActual { nombre: string; ruta: string }

/** Lo que pone la página que abre el diálogo: el Studio (app.ts) o la pestaña de QA (qaPagina.ts). */
export interface ContextoDialogo {
  /** El `<dialog>` donde se pinta. */
  dialogo: () => HTMLDialogElement;
  avisar: (texto: string, bien?: boolean) => void;
  /** El aviso de cuando el servidor no responde. */
  sinServidor: () => string;
  /** La casilla «Es urgente» y su confirmación (solo el Studio la lleva). */
  campoUrgente?: () => string;
  confirmarUrgencia?: () => Promise<boolean>;
  /** Buscar una carpeta en el computador (los campos con `explorar`). */
  elegirCarpeta?: (actual: string, boton: HTMLElement) => Promise<string | null>;
}

let ctx: ContextoDialogo | null = null;
export function ponerContextoDelDialogo(c: ContextoDialogo) {
  ctx = c;
}
const contexto = () => {
  if (!ctx) throw new Error('dialogoNota: sin contexto');
  return ctx;
};

/** La grabadora del ✉ abierto (pedir), para saber qué se perdería si se rehiciera encima. */
let grabadoraAbierta: Grabadora | null = null;
export const grabadoraDelSobre = () => grabadoraAbierta;

/**
 * «Es urgente»: una casilla, sin explicación aparte (el porqué ya está en lo que se pide). Es a propósito poco directa, en
 * dos pasos, para que no se vuelva costumbre: un símbolo discreto junto al título abre el panel, y ahí está la casilla.
 */
function botonUrgente() {
  return `<button type="button" class="abrir-urgente" data-abrir-urgente aria-expanded="false" aria-controls="panel-urgente" title="${esc(tx('buzon.esUrgente'))}">${icono('urgente')}</button>`;
}

/** Lo que dice el ✉ cuando el servidor no guardó lo que se envió (pedir › guardar), después del porqué. */
const sigueAqui = () => tx('dialogo.sigueAqui');

/** Las opciones del diálogo común. `imagenes`: archivos ya adjuntos al abrirlo (la captura marcada de la pestaña de QA). */
export interface OpcionesPedir {
  titulo: string; ayuda?: string; campos: Campo[]; boton: string; cancelar?: string; audio?: boolean; vacioVale?: boolean; adjuntos?: boolean; actuales?: AdjuntoActual[]; urgente?: boolean;
  guardar?: (r: Dicho, senal: AbortSignal) => Promise<boolean>; borrador?: { proyecto: string; sobre: SobreBorrador; soloAlGuardar?: boolean }; enFondo?: boolean;
  imagenes?: File[];
  /** Con la grabación empezada al abrir (la nota de una captura: se marca y se dice). */
  grabarAlAbrir?: boolean;
}

/**
 * El diálogo común (el ✉ y los demás que piden algo). Con `guardar`, no se cierra hasta que el servidor lo guardó
 * (pedido del titular pd_nada_se_corta): mientras guarda, ni Cancelar, ni Esc, ni un clic fuera lo cierran; si no se
 * guardó, queda abierto con todo lo escrito, grabado y adjunto, y lo dice. `guardar` devuelve true si quedó guardado.
 */
export function pedir(o: OpcionesPedir): Promise<Dicho | null> {
  const { avisar } = contexto();
  const dlg = contexto().dialogo();
  // El ✉ es uno solo: si sigue abierto (graba a un lado y la página quedó con clics), no se rehace encima de lo grabado.
  // Queda como está y la persona lee por qué en su pastilla, que siempre está a la vista (grabadora.ts › antesDeOtroSobre)
  const ocupado = antesDeOtroSobre(dlg.open, grabadoraAbierta?.estado ?? 'sin_audio');
  if (ocupado) {
    if (grabadoraAbierta) grabadoraAbierta.avisar(ocupado);
    else avisar(ocupado);
    return Promise.resolve(null);
  }
  // Lo que quedó sin enviar sobre lo mismo vuelve como estaba, y lo dice (borradores.ts; pd_dialogo_unico)
  const previo = o.borrador ? leerBorrador(localStorage, o.borrador.proyecto, o.borrador.sobre) : null;
  if (previo) o = { ...o, campos: o.campos.map((c) => (c.id === 'texto' ? { ...c, valor: previo.texto } : c.id === 'tipoNota' && previo.tipoNota ? { ...c, valor: previo.tipoNota } : previo.campos?.[c.id] !== undefined ? { ...c, valor: previo.campos[c.id] } : c)) };
  // El de una nota (con su borrador o su tipo) lleva data-nota: la tecla N también lo cierra
  const deNota = !!o.borrador || o.campos.some((c) => c.id === 'tipoNota');
  const urgente = !!o.urgente && !!contexto().campoUrgente;
  dlg.innerHTML = `<form method="dialog"${deNota ? ' data-nota' : ''}>
    <header class="cabeza-dialogo">${urgente ? `<div class="titulo-con-urgente"><h2>${esc(o.titulo)}</h2>${botonUrgente()}</div>` : `<h2>${esc(o.titulo)}</h2>`}${o.ayuda ? `<p>${o.ayuda}</p>` : ''}${previo ? `<p class="borrador-guardado" role="status">${tx('dialogo.borrador')} <button type="button" class="enlace" data-borrar-borrador>${tx('dialogo.borrarlo')}</button></p>` : ''}</header>
    ${o.campos
      .map((c) => {
        // Con audio, lo obligatorio de escribir también se puede decir: lo comprueba el envío, no el navegador
        const req = c.requerido && !(o.audio && c.tipo === 'area') ? ' required' : '';
        // Las casillas van en su grupo, con su leyenda: una etiqueta no puede llevar otras dentro
        if (c.tipo === 'casillas')
          return `<fieldset class="campo campo-casillas${c.clase ? ` ${c.clase}` : ''}"><legend class="etiqueta-campo">${esc(c.etiqueta)}</legend>${c.ayuda ? `<span class="ayuda-campo">${esc(c.ayuda)}</span>` : ''}${(c.opciones ?? []).map(([v, n]) => `<label class="casilla-d"><input type="checkbox" name="${c.id}" value="${esc(v)}"${(c.valor ?? '').split(',').includes(v) ? ' checked' : ''}> ${esc(n)}</label>`).join('')}</fieldset>`;
        // Una sola opción, de un toque, como botones (el tipo de una nota, pd_tipo_obligatorio)
        if (c.tipo === 'botones')
          return `<fieldset class="campo campo-botones${c.clase ? ` ${c.clase}` : ''}"><legend class="etiqueta-campo">${esc(c.etiqueta)}</legend>${c.ayuda ? `<span class="ayuda-campo">${esc(c.ayuda)}</span>` : ''}<div class="botones-campo">${(c.opciones ?? []).map(([v, n]) => `<label class="boton-campo"><input type="radio" name="${c.id}" value="${esc(v)}"${v === c.valor ? ' checked' : ''}><span>${esc(n)}</span></label>`).join('')}</div></fieldset>`;
        const control =
          c.tipo === 'area' ? `<textarea name="${c.id}" rows="4"${req}>${esc(c.valor ?? '')}</textarea>`
          : c.tipo === 'select' ? `<select name="${c.id}">${(c.opciones ?? []).map(([v, n]) => `<option value="${esc(v)}"${v === c.valor ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select>`
          : c.explorar ? `<span class="con-explorar"><input name="${c.id}" type="text" value="${esc(c.valor ?? '')}"${req} placeholder="${esc(tx('nuevo.exploraRuta'))}" /><button type="button" data-explorar="${c.id}">${tx('nuevo.explorar')}</button></span>`
          : `<input name="${c.id}" type="text" value="${esc(c.valor ?? '')}"${req}${c.pista ? ` placeholder="${esc(c.pista)}"` : ''} />`;
        return `<label class="campo${c.clase ? ` ${c.clase}` : ''}"><span class="etiqueta-campo">${esc(c.etiqueta)}</span>${c.ayuda ? `<span class="ayuda-campo">${esc(c.ayuda)}</span>` : ''}${control}</label>`;
      })
      .join('')}
    ${o.audio ? '<div class="grabadora" data-grabadora></div>' : ''}
    ${o.actuales?.length ? `<fieldset class="adjuntos-actuales"><legend>${tx('dialogo.yaAdjunto')}</legend>${o.actuales.map((a) => `<label class="casilla-d"><input type="checkbox" name="quitar-adjunto" value="${esc(a.ruta)}"> ${tx('dialogo.quitarAdjunto', { nombre: esc(a.nombre) })}</label>`).join('')}</fieldset>` : ''}
    ${o.adjuntos ? '<div class="adjuntos" data-adjuntos></div>' : ''}
    ${urgente ? contexto().campoUrgente!() : ''}
    <p class="error-explorador" role="alert"></p>
    <div class="botones"><span class="linea-envio" data-linea-envio></span><button type="button" data-cancelar>${esc(o.cancelar ?? tx('cabeza.cancelar'))}</button><button type="submit" class="primario">${esc(o.boton)}</button></div>
  </form>`;
  const grabadora = (grabadoraAbierta = o.audio ? new Grabadora(dlg.querySelector('[data-grabadora]') as HTMLElement) : null);
  if (previo?.audio) void grabadora?.cargar(previo.audio, previo.segundos);
  // Lo adjunto del borrador vuelve también (nota nmwdku7f2tit); y lo que trae al abrirse (la captura marcada)
  const adjuntos = o.adjuntos ? new Adjuntos(dlg.querySelector('[data-adjuntos]') as HTMLElement, dlg.querySelector('form')!, (t) => avisar(t), [...(o.imagenes ?? []), ...(previo?.adjuntos ?? []).flatMap((a) => archivoDeAdjunto(a) ?? [])]) : null;
  // Las áreas de texto, además de «texto», que también vuelven del borrador (al corregir: lo dicho y lo sumado)
  const areasDe = (f: HTMLFormElement) => Object.fromEntries(o.campos.filter((c) => c.tipo === 'area' && c.id !== 'texto').map((c) => [c.id, String(new FormData(f).get(c.id) ?? '')]));
  return new Promise((ok) => {
    const form = dlg.querySelector('form')!;
    // Un error con el diálogo abierto se ve aquí (avisar lo escribe en él): el aviso queda detrás de su velo
    const error = form.querySelector<HTMLElement>('.error-explorador')!;
    // Se resuelve una sola vez y sin depender del evento «close» (no todos los navegadores lo disparan a tiempo)
    let listo = false;
    // Un envío a la vez (con «Enviar ya» o un doble clic, la nota no queda dos veces) y, con `guardar`, mientras guarda
    let enviando = false;
    let guardando = false;
    // «Borrarlo»: el borrador se va y el diálogo se cierra sin guardar otro
    let borrado = false;
    // Dejar de esperar un guardado lento (nota nmwdku7f2tit): lo que siga del guardado ya no guarda nada
    const abandono = new AbortController();
    // Con `enFondo` (corregir una nota, nmwehuc6jtit), «Dejar de esperar» solo cierra la ventana: el guardado sigue por
    // detrás, contado en NotasEnCurso por su `guardar`, y su borrador se queda hasta que termina bien
    let enFondo = false;
    // Con `soloAlGuardar` (corregir una nota), el borrador nace solo si se intentó guardar: abrir y cancelar no deja uno
    let seIntentoGuardar = false;
    const terminar = (resultado: Dicho | null) => {
      if (listo) return;
      listo = true;
      dlg.removeEventListener('close', alCerrar);
      dlg.removeEventListener('cancel', alCancelar);
      // Lo escrito, lo elegido y lo adjunto se leen antes de cerrar; lo grabado, cuando la grabación termina
      // Si el guardado sigue por detrás, su borrador ya quedó al intentar guardar: no se escribe otro que lo pise al terminar
      const escrito = o.borrador && !resultado && !borrado && !enFondo && (!o.borrador.soloAlGuardar || seIntentoGuardar) ? { texto: String(new FormData(form).get('texto') ?? ''), tipoNota: String(new FormData(form).get('tipoNota') ?? '') || undefined, campos: areasDe(form) } : null;
      const archivos = escrito && adjuntos && !adjuntos.vacio ? adjuntos.datos().catch(() => null) : null;
      const fin = grabadora?.terminar();
      adjuntos?.terminar();
      if (dlg.open) dlg.close();
      ok(resultado);
      if (o.borrador && (resultado || borrado)) quitarBorrador(localStorage, o.borrador.proyecto, o.borrador.sobre);
      // Cerrado sin enviar: queda como borrador, en silencio (pd_dialogo_unico); solo se dice si algo no cupo
      if (o.borrador && escrito) void guardarAlCerrar({ proyecto: o.borrador.proyecto, sobre: o.borrador.sobre }, o.titulo, escrito, fin, grabadora, archivos);
    };
    // Mientras guarda, nada lo cambia: ni lo escrito, ni la grabadora, ni lo adjunto; y nada lo cierra por accidente (Esc,
    // un clic fuera). Pero con borrador, «Dejar de esperar» siempre lo cierra: un guardado que no termina (transcribir lo
    // grabado con la revisión de otro proyecto corriendo) dejaba la interfaz sin salida, y recargar perdía todo (nmwdku7f2tit)
    const cancelar = form.querySelector<HTMLButtonElement>('[data-cancelar]')!;
    // Enviar con su cargador (pd_cargadores, nmwjofnwgtit): el botón se apaga ya, el círculo a la izquierda de sus palabras a
    // los 500 ms, «Sigue guardando…» a los 30 s y, si no se guardó, la línea roja al lado con el porqué
    const enviar = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    const lineaEnvio = form.querySelector<HTMLElement>('[data-linea-envio]')!;
    const envio = crearCargadores(() => {
      const e = envio.estado(CLAVE_ENVIAR_NOTA);
      enviar.innerHTML = contenidoDelBoton(esc(o.boton), e);
      lineaEnvio.innerHTML = lineaDelCargador(CLAVE_ENVIAR_NOTA, e);
    });
    const marcarGuardando = (si: boolean) => {
      guardando = si;
      form.querySelectorAll<HTMLButtonElement>(o.borrador ? '.botones button:not([data-cancelar])' : '.botones button').forEach((b) => (b.disabled = si));
      if (o.borrador) cancelar.textContent = si ? tx('dialogo.dejarDeEsperar') : (o.cancelar ?? tx('cabeza.cancelar'));
      form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('textarea, input[type="text"]').forEach((c) => (c.readOnly = si));
      form.querySelectorAll<HTMLElement>('[data-grabadora], [data-adjuntos]').forEach((x) => (x.inert = si));
    };
    cancelar.addEventListener('click', () => {
      if (!guardando) return terminar(null);
      if (!o.borrador) return;
      if (o.enFondo) {
        // Solo cierra la ventana (nmwehuc6jtit): el guardado sigue y lo dicho llega a su nota, en su proyecto
        enFondo = true;
        guardando = false;
        terminar(null);
        return avisar(tx('dialogo.sigueEnFondo'), true);
      }
      // Deja de esperar: lo que siga del guardado no guarda nada, y lo de aquí queda como borrador
      abandono.abort();
      guardando = false;
      terminar(null);
      avisar(tx('dialogo.quedoEnBorrador'), true);
    });
    // Las carpetas se buscan en el explorador del computador
    form.addEventListener('click', async (e) => {
      if ((e.target as HTMLElement).closest('[data-borrar-borrador]') && !guardando) {
        borrado = true;
        terminar(null);
        return avisar(tx('dialogo.borraste'), true);
      }
      // El primer paso de la urgencia: abre (o cierra) su panel; al cerrarlo, deja de estar marcada
      const u = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-abrir-urgente]');
      if (u) {
        const panel = form.querySelector<HTMLElement>('.panel-urgente')!;
        panel.hidden = !panel.hidden;
        u.setAttribute('aria-expanded', String(!panel.hidden));
        if (panel.hidden) form.querySelector<HTMLInputElement>('[name="urgente"]')!.checked = false;
        return;
      }
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-explorar]');
      if (!b || !contexto().elegirCarpeta) return;
      const campo = form.querySelector<HTMLInputElement>(`[name="${b.dataset.explorar}"]`)!;
      const elegida = await contexto().elegirCarpeta!(campo.value, b);
      if (elegida) campo.value = elegida;
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (enviando) return;
      enviando = true;
      try {
        error.textContent = '';
        const valores = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
        // Las casillas marcadas, todas juntas (FormData deja solo la última de cada nombre)
        for (const c of o.campos) if (c.tipo === 'casillas') valores[c.id] = new FormData(form).getAll(c.id).map(String).join(',');
        // Lo que falta se dice antes de cerrar la grabación: cerrarla quitaba «Añadir otro fragmento», y quien olvidó
        // elegir el tipo ya no podía seguir grabando (nota del titular nmvsyxjd6tit, 28 de octubre de 2026)
        const hayAudio = !!grabadora && grabadora.estado !== 'sin_audio';
        // Lo que es obligatorio de escribir vale también dicho en audio; lo que se elige de un toque, no
        const falta = o.campos.find((c) => c.requerido && !(valores[c.id] ?? '').trim() && (c.tipo === 'botones' || !hayAudio));
        if (falta) return avisar(tx(falta.tipo === 'botones' ? 'dialogo.elige' : o.audio ? 'dialogo.faltaAudio' : 'dialogo.falta', { campo: falta.etiqueta }));
        const audio = grabadora ? await grabadora.datos() : null;
        const archivos = adjuntos && !adjuntos.vacio ? await adjuntos.datos() : null;
        // La casilla de urgencia no es contenido: una nota marcada urgente y vacía sigue vacía
        const escrito = Object.entries(valores).some(([k, v]) => k !== 'urgente' && !o.campos.some((c) => c.id === k && c.tipo === 'botones') && v.trim());
        if (o.audio && !o.vacioVale && !audio && !archivos && !escrito) return avisar(tx(o.adjuntos ? 'dialogo.vacioAdjuntos' : 'dialogo.vacio'));
        if (urgente && valores.urgente && contexto().confirmarUrgencia && !(await contexto().confirmarUrgencia!())) return;
        // Si lo cerraron (Cancelar o Esc) mientras se preparaba el audio o lo adjunto, no se envía nada
        if (listo) return;
        // Lo adjunto que se quita al corregir una nota (pd_corregir_adjuntos): una casilla por adjunto, con su ruta
        const quitar = new FormData(form).getAll('quitar-adjunto').map(String);
        const resultado = { ...valores, ...(audio ? { audio } : {}), ...(archivos ? { adjuntos: archivos } : {}), ...(quitar.length ? { quitarAdjuntos: quitar } : {}) } as Dicho;
        if (!o.guardar) return terminar(resultado);
        // Antes de esperar al servidor, todo queda como borrador en este navegador: si la página se recarga a mitad del
        // guardado, lo escrito, lo grabado y lo adjunto no se pierden (nmwdku7f2tit). Al guardarse, se quita
        if (o.borrador) {
          seIntentoGuardar = true;
          guardarBorrador(localStorage, { proyecto: o.borrador.proyecto, sobre: o.borrador.sobre, titulo: o.titulo, texto: valores.texto ?? '', tipoNota: valores.tipoNota || undefined, campos: areasDe(form), ...(audio ? { audio, segundos: grabadora?.duracion } : {}), ...(archivos ? { adjuntos: archivos } : {}), cuando: new Date().toISOString() });
        }
        // Se cierra solo cuando el servidor lo guardó: lo que falla al guardar (también si se lanza) cuenta como no guardado
        marcarGuardando(true);
        const guardado = await envio.correr(CLAVE_ENVIAR_NOTA, { guarda: true }, () => Promise.resolve(resultado).then((r) => o.guardar!(r, abandono.signal)).catch(() => false)) === true;
        // Si dejó de esperar, el diálogo ya se cerró con su borrador
        if (abandono.signal.aborted) return;
        // Terminó por detrás, con la ventana ya cerrada: guardado, su borrador se va; si no, el borrador queda y se dice
        if (enFondo) {
          if (!guardado) return avisar(tx('dialogo.fondoNoGuardo'));
          if (o.borrador) quitarBorrador(localStorage, o.borrador.proyecto, o.borrador.sobre);
          return;
        }
        marcarGuardando(false);
        if (guardado) return terminar(resultado);
        // El porqué ya lo dejó aquí el aviso (avisar); el de sin servidor ya dice que nada se perdió
        // y pasa a la línea roja, al lado de «Enviar» (nmwjk36a8tit)
        const porque = (error.textContent ?? '').trim();
        error.textContent = '';
        const sin = contexto().sinServidor();
        envio.fallo(CLAVE_ENVIAR_NOTA, porque === sin ? `${tx('dialogo.noGuardo')} ${porque}` : `${porque ? tx('dialogo.noGuardoPorque', { porque: porque.replace(/\.$/, '') }) : tx('dialogo.noGuardo')} ${sigueAqui()}`);
      } finally {
        enviando = false;
        // Con «Enviar ya», el diálogo se envía a un lado: si el envío no siguió, vuelve al frente con su aviso (nota nmvvki7gktit)
        if (!listo) grabadora?.alFrente();
      }
    });
    // Con Esc el navegador lo cierra solo: se resuelve sin respuesta (si sigue abierto, solo se hizo a un lado para grabar).
    // Mientras guarda, se vuelve a abrir: con dos Esc seguidos, el navegador lo cierra aunque su «cancel» se lo impida
    const alCerrar = () => {
      if (dlg.open) return;
      if (guardando) dlg.showModal();
      else terminar(null);
    };
    // Esc y un clic fuera (modal.ts › cerrarConClicFuera) piden su «cancel»: mientras guarda, no se cierra
    const alCancelar = (e: Event) => {
      if (guardando) e.preventDefault();
      else terminar(null);
    };
    dlg.addEventListener('close', alCerrar);
    dlg.addEventListener('cancel', alCancelar);
    dlg.showModal();
    // La nota de una captura abre grabando: lo marcado se dice en voz (nmwplyqprtit)
    if (o.grabarAlAbrir && grabadora) dlg.querySelector<HTMLButtonElement>('[data-g="grabar"]')?.click();
    else (dlg.querySelector('textarea, input, select') as HTMLElement | null)?.focus();
  });
}

/**
 * Guarda como borrador lo que quedó sin enviar al cerrar el diálogo (borradores.ts; pd_dialogo_unico): lo escrito, el
 * tipo elegido y, cuando su grabación termina, el audio. En silencio, salvo que el audio no quepa en este navegador.
 */
async function guardarAlCerrar(donde: { proyecto: string; sobre: SobreBorrador }, titulo: string, escrito: { texto: string; tipoNota?: string; campos?: Record<string, string> }, fin: Promise<void> | undefined, grabadora: Grabadora | null, archivos: Promise<{ nombre: string; datos: string }[] | null> | null = null) {
  const { avisar } = contexto();
  await fin?.catch(() => undefined);
  const audio = (await grabadora?.datos().catch(() => null)) ?? undefined;
  const adjuntos = (await archivos) ?? undefined;
  const como = guardarBorrador(localStorage, { ...donde, titulo, ...escrito, ...(audio ? { audio, segundos: grabadora?.duracion } : {}), ...(adjuntos?.length ? { adjuntos } : {}), cuando: new Date().toISOString() });
  if (como === 'sin_adjuntos') avisar(tx('dialogo.borradorSinAdjuntos'));
  else if (como === 'sin_audio') avisar(tx('dialogo.borradorSinAudio'));
  else if (como === 'no') avisar(tx('dialogo.borradorNo'));
}
