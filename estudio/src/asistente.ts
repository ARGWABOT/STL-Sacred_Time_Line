// La ventana del asistente de instalación (pedido pd_valores_instalar): a pantalla completa, por pasos, abierta la primera
// vez sin poder cerrarse hasta elegir (sin ella, el director quedaría sin modelo ni permisos). Lo que decide está en
// src/director/asistente.ts; aquí, solo lo que se ve. La misma ventana se abre entera con «Repasar la instalación», en
// «Modelo y consumo», con lo que quedó marcado, y ahí sí se cierra. «Verla como quien instala» la abre como la primera vez, sin
// guardar nada.
import './asistente.css';
import {
  conPlan, dejarComoViene, ESFUERZO_DEL_ASISTENTE, marcadoDeEntrada, modeloDePlan, modelosDelPaso, MODO_DEL_ASISTENTE, PAQUETE_DE_PERMISOS, pasoAnterior, pasoSiguiente, PASOS_ASISTENTE, PLANES_ELEGIBLES,
  type EstadoAsistente, type PasoAsistente, type PlanElegido,
} from '../../src/director/asistente';
import { PLANES_DE_CLAUDE, type PlanDeClaude } from '../../src/director/consumoDelPlan';
import { esIdioma } from '../../src/director/idioma';
import { vozPuedeSeguir, type EstadoVoz, type QueInstala } from '../../src/director/instalacionVoz';
import { cuerpoVoz, PRUEBA_NUEVA, zonaPrueba, zonaTranscripcion, zonaVoces, type PruebaMic } from './asistenteVoz';
import { enDatos, Grabadora } from './grabadora';
import { nombreEsfuerzo, nombreModelo } from './modeloDelDirector';
import { selectorIdioma } from './selectorIdioma';
import { idiomaActual, ponerIdioma, t, type ClaveDeTexto } from './textos';
import { esc } from './util';

/** Lo que dice el servidor del computador (api.ts › /asistente). */
interface DatosAsistente {
  abre: boolean;
  estado: EstadoAsistente | null;
  plan: PlanElegido | null;
  modelo: string | null;
  modo: EstadoAsistente['modo'] | null;
  marcados: string[];
}

/** La sesión de Claude Code (revisor.ts › sesionDeClaude); null, comprobando. */
type Sesion = { ok: true } | { ok: false; falta: 'programa' | 'sesion'; orden: string } | null;

const RUTA = '/__estudio/director/asistente';
/** Donde se ve el plan de la cuenta: «No lo sé» lleva ahí (decisión del 31 de octubre de 2026). */
const USO_DE_CLAUDE = 'https://claude.ai/settings/usage';

const nombrePlan = (p: PlanElegido | undefined) => (p === 'nose' || !p ? t('asistente.planNoLoSe') : PLANES_DE_CLAUDE[p as PlanDeClaude].nombre);
const nombreModo = (m: EstadoAsistente['modo']) => t(m === 'autorizado' ? 'asistente.modoAutorizado' : m === 'automatico' ? 'asistente.modoAutomatico' : 'asistente.modoPregunta');

/** Lo que dice cada pantalla: su título y su explicación, por su paso. Puro, salvo el idioma. */
const TITULOS: Record<PasoAsistente, ClaveDeTexto> = {
  inicio: 'asistente.inicioTitulo',
  plan: 'asistente.planTitulo',
  modelo: 'asistente.modeloTitulo',
  permisos: 'asistente.permisosTitulo',
  lista: 'asistente.listaTitulo',
  voz: 'asistente.vozTitulo',
  final: 'asistente.finalTitulo',
};

/** El bloque de la sesión de Claude Code: mientras falte, la guía paso a paso, y no deja seguir. */
export function bloqueSesion(sesion: Sesion): string {
  if (!sesion) return `<p class="como" role="status">${t('asistente.sesionMirando')}</p>`;
  if (sesion.ok) return `<p class="asistente-ok" role="status">✓ ${t('asistente.sesionLista')}</p>`;
  const guia = sesion.falta === 'programa' ? 'asistente.faltaPrograma' : 'asistente.faltaSesion';
  return `<div class="aviso asistente-falta" role="alert"><p>${t(guia)}</p>
    <div class="orden-paso"><code>${esc(sesion.orden)}</code><div class="acciones-orden"><button type="button" class="abrir-terminal" data-asistente-terminal>${t('asistente.abrirTerminal')}</button><button type="button" class="boton-suave" data-asistente-copiar="${esc(sesion.orden)}">${t('asistente.copiar')}</button></div></div>
    <p>${t('asistente.alTerminarSesion')}</p>
    <button type="button" class="primario" data-asistente-comprobar>${t('asistente.yaInicie')}</button></div>`;
}

/** Lo de cada pantalla, sin sus botones de ir y volver. Puro, salvo el idioma. */
export function cuerpoDe(e: EstadoAsistente, sesion: Sesion, actual: string | null, voz: { estado: EstadoVoz | null; prueba: PruebaMic; repaso: boolean } = { estado: null, prueba: PRUEBA_NUEVA, repaso: false }): string {
  if (e.paso === 'voz') return cuerpoVoz(e, voz.estado, voz.prueba, voz.repaso);
  // Termina con STL Studio activo, con su diagnóstico hecho, y lleva a entregar el proyecto propio (decisión del 26 de octubre)
  if (e.paso === 'final') return `<p>${t('asistente.finalQue')}</p><p>${t('asistente.finalSigue')}</p>`;
  // El idioma se elige en su primera pantalla (pd_idiomas: tu elección del 30 de octubre)
  if (e.paso === 'inicio') return `<div class="selector-idioma">${selectorIdioma(idiomaActual())}</div><p>${t('asistente.inicioQue')}</p>${bloqueSesion(sesion)}`;
  if (e.paso === 'plan') {
    return `<p>${t('asistente.planQue')}</p><div class="asistente-opciones" role="radiogroup">${PLANES_ELEGIBLES.map((p) => `<label class="asistente-opcion"><input type="radio" name="asistente-plan" value="${p}"${e.plan === p ? ' checked' : ''} data-asistente-plan /> <b>${esc(nombrePlan(p))}</b>${p === 'nose' ? `<small>${t('asistente.planNoLoSeQue')}</small>` : ''}</label>`).join('')}</div>
      <p><a href="${USO_DE_CLAUDE}" target="_blank" rel="noopener">${t('asistente.verMiPlan')} ↗</a></p>`;
  }
  if (e.paso === 'modelo') {
    const recomendado = modeloDePlan(e.plan);
    return `<p>${t('asistente.modeloQue', { plan: esc(nombrePlan(e.plan)), esfuerzo: esc(nombreEsfuerzo(ESFUERZO_DEL_ASISTENTE)) })}</p><div class="asistente-opciones" role="radiogroup">${modelosDelPaso(e.plan, actual).map((m) => `<label class="asistente-opcion"><input type="radio" name="asistente-modelo" value="${esc(m)}"${(e.modelo ?? recomendado) === m ? ' checked' : ''} data-asistente-modelo /> <b>${esc(nombreModelo(m))}</b>${m === recomendado ? `<small>${t('asistente.recomendado')}</small>` : ''}</label>`).join('')}</div>`;
  }
  if (e.paso === 'permisos') {
    const marcados = e.paquete ?? marcadoDeEntrada();
    const modo = e.modo ?? MODO_DEL_ASISTENTE;
    return `<p>${t('asistente.permisosQue')}</p>
      <h3>${t('asistente.modoTitulo')}</h3>
      <div class="asistente-opciones" role="radiogroup">${(['pregunta', 'autorizado'] as const).map((m) => `<label class="asistente-opcion"><input type="radio" name="asistente-modo" value="${m}"${modo === m ? ' checked' : ''} data-asistente-modo /> <b>${esc(nombreModo(m))}</b><small>${t(m === 'pregunta' ? 'asistente.modoPreguntaQue' : 'asistente.modoAutorizadoQue')}</small></label>`).join('')}</div>
      <h3>${t('asistente.paqueteTitulo')}</h3>
      <div class="asistente-opciones">${PAQUETE_DE_PERMISOS.map((g) => `<label class="asistente-opcion"><input type="checkbox" value="${g.id}"${marcados.includes(g.id) ? ' checked' : ''} data-asistente-grupo /> <b>${t(`asistente.grupo.${g.id}` as ClaveDeTexto)}</b><small>${t(`asistente.grupo.${g.id}Que` as ClaveDeTexto)}</small><small>${t(`asistente.grupo.${g.id}Cuando` as ClaveDeTexto)}</small></label>`).join('')}</div>
      <p class="como">${t('asistente.yaVienen')}</p>
      <p class="como">${t('asistente.nunca')}</p>`;
  }
  const marcados = PAQUETE_DE_PERMISOS.filter((g) => (e.paquete ?? []).includes(g.id));
  const fila = (paso: PasoAsistente, nombre: ClaveDeTexto, valor: string) => `<li><span class="asistente-fila"><b>${t(nombre)}</b> ${esc(valor)}</span><button type="button" class="enlace" data-asistente-ir="${paso}">${t('asistente.cambiar')}</button></li>`;
  return `<p>${t('asistente.listaQue')}</p><ul class="asistente-lista" role="list">
    ${fila('plan', 'asistente.filaPlan', nombrePlan(e.plan))}
    ${fila('modelo', 'asistente.filaModelo', `${nombreModelo(e.modelo ?? modeloDePlan(e.plan))} · ${nombreEsfuerzo(ESFUERZO_DEL_ASISTENTE)}`)}
    ${fila('permisos', 'asistente.filaModo', nombreModo(e.modo ?? MODO_DEL_ASISTENTE))}
    ${fila('permisos', 'asistente.filaPaquete', marcados.map((g) => t(`asistente.grupo.${g.id}` as ClaveDeTexto)).join(' · ') || t('asistente.ninguno'))}
  </ul>`;
}

/**
 * Los botones de cada pantalla. Sin la sesión lista, los de seguir no se ofrecen; en la de la voz, mientras no se pueda seguir
 * (`vozLista`, instalacionVoz.ts › vozPuedeSeguir), tampoco. `muestra`: no se guarda nada. Puro, salvo el idioma.
 */
export function botonesDe(paso: PasoAsistente, sesion: Sesion, repaso: boolean, vozLista = false, muestra = false): string {
  if (paso === 'voz') return `${repaso ? `<button type="button" data-asistente-cerrar>${t('asistente.cerrar')}</button>` : ''}${vozLista ? `<button type="button" class="primario grande" data-asistente-siguiente autofocus>${t('asistente.siguiente')}</button>` : ''}`;
  // Al final no se vuelve atrás: lo elegido ya quedó, y se cambia con «Repasar la instalación». Sin guardar nada, solo se cierra
  if (paso === 'final') {
    // En la muestra se ven los botones de quien instala, sin que hagan nada
    if (muestra) return `<button type="button" data-asistente-cerrar autofocus>${t('asistente.cerrar')}</button><button type="button" disabled>${t('asistente.finalSeguir')}</button><button type="button" class="primario grande" disabled>${t('asistente.finalEntregar')}</button>`;
    if (repaso) return `<button type="button" class="primario grande" data-asistente-cerrar autofocus>${t('asistente.cerrar')}</button>`;
    return `<button type="button" data-asistente-terminar="seguir">${t('asistente.finalSeguir')}</button><button type="button" class="primario grande" data-asistente-terminar="entregar" autofocus>${t('asistente.finalEntregar')}</button>`;
  }
  if (paso === 'inicio') {
    if (!sesion?.ok) return repaso ? `<button type="button" data-asistente-cerrar>${t('asistente.cerrar')}</button>` : '';
    return `${repaso ? `<button type="button" data-asistente-cerrar>${t('asistente.cerrar')}</button>` : ''}<button type="button" data-asistente-siguiente>${t('asistente.repasarCada')}</button><button type="button" class="primario grande" data-asistente-como-viene autofocus>${t('asistente.comoViene')}</button>`;
  }
  const volver = `<button type="button" data-asistente-volver>${t('asistente.volver')}</button>`;
  // Al repasar, también se ve lo que sigue sin guardar nada
  if (paso === 'lista') return `${repaso ? `<button type="button" data-asistente-cerrar>${t('asistente.cerrar')}</button><button type="button" data-asistente-siguiente>${t('asistente.seguirSinGuardar')}</button>` : ''}${muestra ? '' : `<button type="button" class="primario grande" data-asistente-guardar autofocus>${t('asistente.guardar')}</button>`}`;
  return `${repaso ? `<button type="button" data-asistente-cerrar>${t('asistente.cerrar')}</button>` : ''}${volver}<button type="button" data-asistente-como-viene>${t('asistente.comoViene')}</button><button type="button" class="primario grande" data-asistente-siguiente autofocus>${t('asistente.siguiente')}</button>`;
}

let abierta: HTMLDialogElement | null = null;

/**
 * Abre la ventana; la primera vez no se cierra sin elegir, y al repasar, sí. Con `alTerminar`, lo que hace la página después.
 * Con `muestra`, como la primera vez, con todo como viene, pero se cierra y no guarda nada: es para verla.
 */
function abrir(datos: DatosAsistente, repaso: boolean, alTerminar: (entregar: boolean) => void, muestra = false) {
  if (abierta) return;
  let estado: EstadoAsistente = muestra
    ? { paso: 'inicio' }
    : repaso
    ? { paso: 'inicio', plan: datos.plan ?? undefined, modelo: datos.modelo ?? undefined, modo: datos.modo ?? undefined, paquete: datos.marcados }
    : (datos.estado ?? { paso: 'inicio' });
  let sesion: Sesion = null;
  let guardando = false;
  let voz: EstadoVoz | null = null;
  let prueba: PruebaMic = PRUEBA_NUEVA;
  let grabadora: Grabadora | null = null;
  let sondeo: ReturnType<typeof setTimeout> | null = null;
  // Lo que se guardó al repasar: al cerrar, la página se recarga con ello
  let guardado = false;
  let entregarAlTerminar = false;
  const dlg = document.createElement('dialog');
  dlg.className = 'asistente';
  dlg.setAttribute('aria-label', t('asistente.etiqueta'));
  abierta = dlg;
  // Sin elegir no se cierra (sin ella, el director quedaría sin modelo ni permisos): Esc no hace nada la primera vez
  dlg.addEventListener('cancel', (e) => {
    if (!repaso) e.preventDefault();
  });
  dlg.addEventListener('close', () => {
    if (sondeo) clearTimeout(sondeo);
    // Cerrada a mitad de una grabación, el micrófono no queda encendido
    void grabadora?.terminar();
    grabadora = null;
    dlg.remove();
    abierta = null;
    if (guardado) alTerminar(entregarAlTerminar);
  });

  const recordar = () => {
    if (repaso) return;
    void fetch(RUTA, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(estado) }).catch(() => {});
  };
  const decir = (texto: string) => {
    const e = dlg.querySelector<HTMLElement>('.asistente-error');
    if (e) {
      e.textContent = texto;
      e.hidden = false;
    }
  };
  const botones = () => botonesDe(estado.paso, sesion, repaso, vozPuedeSeguir(estado, voz, repaso), muestra);
  /** La grabadora de la prueba, en cuanto su lugar está en la pantalla: la frase sigue a la vista mientras se graba. */
  const armarGrabadora = () => {
    const caja = dlg.querySelector<HTMLElement>('[data-asistente-grabadora]');
    if (!caja) return;
    const g = new Grabadora(caja, true);
    grabadora = g;
    g.alFallar = (error) => {
      void g.terminar();
      grabadora = null;
      prueba = { ...prueba, fase: 'fallo', error };
      pintarPrueba();
    };
    g.alDetener = (blob) => {
      void g.terminar();
      grabadora = null;
      prueba = { ...prueba, fase: 'transcribiendo', intentos: prueba.intentos + 1 };
      pintarPrueba();
      void transcribirPrueba(blob);
    };
  };
  const transcribirPrueba = async (blob: Blob) => {
    const r = await enDatos(blob).then((audio) => fetch(`${RUTA}/prueba-mic`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audio }) })).catch((x) => x as Error);
    const c = r instanceof Error ? null : ((await r.json().catch(() => null)) as { texto?: string; error?: string } | null);
    prueba = c?.texto ? { ...prueba, fase: 'entendio', entendido: c.texto } : { ...prueba, fase: 'fallo', error: t('asistente.voz.noTranscribio', { error: c?.error ?? t('asistente.sinServidor') }) };
    pintarPrueba();
  };
  const pintarPrueba = () => {
    const z = dlg.querySelector<HTMLElement>('[data-voz-prueba]');
    if (!z) return;
    // «No tengo micrófono ahora» en plena grabación: el micrófono no queda encendido
    void grabadora?.terminar();
    grabadora = null;
    z.innerHTML = zonaPrueba(estado, prueba, voz);
    armarGrabadora();
    pintarBotones();
  };
  const pintarBotones = () => {
    const b = dlg.querySelector<HTMLElement>('.asistente-botones');
    if (b) b.innerHTML = botones();
  };
  /** Lo que avanza con cada consulta. La prueba solo se toca si recién le toca aparecer: pintarla cortaría la grabación. */
  const pintarVoz = (antes: EstadoVoz | null) => {
    const z = (s: string) => dlg.querySelector<HTMLElement>(s);
    const trans = z('[data-voz-transcripcion]');
    if (trans) trans.innerHTML = zonaTranscripcion(voz, repaso);
    const voces = z('[data-voz-voces]');
    if (voces) voces.innerHTML = zonaVoces(voz, repaso);
    if ((antes?.transcripcion.estado === 'lista') !== (voz?.transcripcion.estado === 'lista')) pintarPrueba();
    else pintarBotones();
  };
  /** La instalación misma, sin que nadie la pida la primera vez; al repasar o en la muestra, solo con su botón. */
  const pedirInstalar = async (que: QueInstala) => {
    const r = await fetch(`${RUTA}/instalar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ que }) }).catch(() => null);
    if (r?.ok) voz = (await r.json().catch(() => voz)) as EstadoVoz | null;
    else decir(t('asistente.sinServidor'));
  };
  /** Mira cómo van las descargas y, la primera vez, lanza la que le toca, sin preguntar: primero la transcripción, y después las voces. */
  const mirarVoz = async () => {
    if (sondeo) clearTimeout(sondeo);
    if (estado.paso !== 'voz' || !dlg.isConnected) return;
    const antes = voz;
    const leido = await fetch(`${RUTA}/voz`).then((r) => (r.ok ? (r.json() as Promise<EstadoVoz>) : null)).catch(() => null);
    if (estado.paso !== 'voz') return;
    if (leido) voz = leido;
    if (voz && !repaso) {
      if (voz.transcripcion.estado === 'sin_instalar') await pedirInstalar('transcripcion');
      else if (voz.transcripcion.estado === 'lista' && voz.voces.estado === 'sin_instalar') await pedirInstalar('voces');
    }
    pintarVoz(antes);
    if (!voz || voz.transcripcion.estado === 'instalando' || voz.voces.estado === 'instalando') sondeo = setTimeout(() => void mirarVoz(), 1500);
  };
  const pintar = () => {
    const n = PASOS_ASISTENTE.indexOf(estado.paso) + 1;
    // Rehacer la pantalla se lleva la grabadora con ella: el micrófono no queda encendido
    void grabadora?.terminar();
    grabadora = null;
    dlg.innerHTML = `<div class="asistente-caja"><span class="etiqueta">${t('asistente.etiqueta')} · ${t('asistente.pasoDe', { n, total: PASOS_ASISTENTE.length })}</span>${muestra ? `<p class="aviso" role="status">${t('asistente.muestra')}</p>` : ''}<h1>${t(TITULOS[estado.paso])}</h1>${cuerpoDe(estado, sesion, datos.modelo, { estado: voz, prueba, repaso })}<p class="asistente-error" role="alert" hidden></p><div class="botones asistente-botones">${botones()}</div></div>`;
    armarGrabadora();
  };
  const ir = (paso: PasoAsistente) => {
    estado = { ...estado, paso, ...(paso === 'modelo' && !estado.modelo ? { modelo: modeloDePlan(estado.plan) } : {}) };
    recordar();
    pintar();
    if (paso === 'voz') void mirarVoz();
  };
  const mirarSesion = async () => {
    sesion = null;
    if (estado.paso === 'inicio') pintar();
    sesion = await fetch(`${RUTA}/sesion`).then((r) => r.json()).catch(() => ({ ok: true }) as Sesion);
    if (estado.paso === 'inicio') pintar();
  };
  const guardar = async () => {
    if (guardando) return;
    guardando = true;
    const cuerpo = { plan: estado.plan ?? 'nose', modelo: estado.modelo ?? modeloDePlan(estado.plan), modo: estado.modo ?? MODO_DEL_ASISTENTE, paquete: estado.paquete ?? marcadoDeEntrada(), repaso };
    const r = await fetch(`${RUTA}/aplicar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) }).catch((x) => x as Error);
    guardando = false;
    if (r instanceof Error) return decir(t('asistente.sinServidor'));
    if (!r.ok) return decir(((await r.json().catch(() => null)) as { error?: string } | null)?.error ?? t('asistente.noSeGuardo'));
    // Lo elegido ya quedó: sigue la pantalla de la voz, que puede tardar
    if (repaso) guardado = true;
    ir('voz');
  };
  const terminar = async (entregar: boolean) => {
    const r = await fetch(`${RUTA}/terminar`, { method: 'POST' }).catch((x) => x as Error);
    if (r instanceof Error || !r.ok) return decir(t('asistente.sinServidor'));
    entregarAlTerminar = entregar;
    guardado = true;
    dlg.close();
  };

  dlg.addEventListener('change', (ev) => {
    const c = ev.target as HTMLInputElement;
    if (c.matches('[data-asistente-plan]')) estado = conPlan(estado, c.value as PlanElegido);
    else if (c.matches('[data-asistente-modelo]')) estado = { ...estado, modelo: c.value };
    else if (c.matches('[data-asistente-modo]')) estado = { ...estado, modo: c.value as EstadoAsistente['modo'] };
    else if (c.matches('[data-asistente-grupo]')) estado = { ...estado, paquete: [...dlg.querySelectorAll<HTMLInputElement>('[data-asistente-grupo]:checked')].map((x) => x.value) };
    else return;
    recordar();
  });
  dlg.addEventListener('click', async (ev) => {
    const b = (ev.target as HTMLElement).closest<HTMLElement>('button');
    if (!b) return;
    if (esIdioma(b.dataset.idioma)) {
      const idioma = b.dataset.idioma;
      ponerIdioma(idioma);
      void fetch('/__estudio/director/idioma', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idioma }) }).catch(() => {});
      return pintar();
    }
    if (b.matches('[data-asistente-cerrar]')) return dlg.close();
    if (b.dataset.asistenteTerminar) return void terminar(b.dataset.asistenteTerminar === 'entregar');
    if (b.dataset.asistenteInstalar) {
      if (muestra) return;
      return void pedirInstalar(b.dataset.asistenteInstalar as QueInstala).then(mirarVoz);
    }
    if (b.dataset.asistentePrueba) {
      const r = b.dataset.asistentePrueba;
      if (r === 'otra') {
        estado = { ...estado, prueba: undefined };
        prueba = { ...prueba, fase: 'grabar', entendido: undefined, error: undefined };
      } else estado = { ...estado, prueba: r as EstadoAsistente['prueba'] };
      recordar();
      return pintarPrueba();
    }
    if (b.matches('[data-asistente-siguiente]')) return ir(pasoSiguiente(estado.paso));
    if (b.matches('[data-asistente-volver]')) return ir(pasoAnterior(estado.paso));
    if (b.dataset.asistenteIr) return ir(b.dataset.asistenteIr as PasoAsistente);
    if (b.matches('[data-asistente-como-viene]')) {
      estado = { ...dejarComoViene(estado), modo: estado.modo ?? MODO_DEL_ASISTENTE };
      recordar();
      return pintar();
    }
    if (b.matches('[data-asistente-guardar]')) return void guardar();
    if (b.matches('[data-asistente-comprobar]')) return void mirarSesion();
    if (b.dataset.asistenteCopiar) return void navigator.clipboard.writeText(b.dataset.asistenteCopiar).catch(() => decir(t('asistente.noSeCopio')));
    if (b.matches('[data-asistente-terminal]')) {
      const r = await fetch(`${RUTA}/terminal`, { method: 'POST' }).catch((x) => x as Error);
      if (r instanceof Error || !r.ok) decir(r instanceof Error ? t('asistente.sinServidor') : ((await r.json().catch(() => null)) as { error?: string } | null)?.error ?? t('asistente.noSeAbrio'));
    }
  });

  document.body.append(dlg);
  pintar();
  dlg.showModal();
  if (estado.paso === 'inicio') void mirarSesion();
  else void fetch(`${RUTA}/sesion`).then((r) => r.json()).then((s: Sesion) => (sesion = s)).catch(() => {});
  if (estado.paso === 'voz') void mirarVoz();
}

const leerDatos = () => fetch(RUTA).then((r) => (r.ok ? (r.json() as Promise<DatosAsistente>) : null)).catch(() => null);

/** Al cargar el Studio: se abre solo cuando le toca (asistente.ts › abreSolo), y si algo falla, el Studio sigue como siempre. */
export async function iniciarAsistente(alTerminar: (entregar: boolean) => void) {
  document.addEventListener('click', async (ev) => {
    const b = (ev.target as HTMLElement).closest('[data-repasar-instalacion], [data-ver-instalacion]');
    if (!b) return;
    const datos = await leerDatos();
    if (datos) abrir(datos, true, alTerminar, b.matches('[data-ver-instalacion]'));
  });
  const datos = await leerDatos();
  if (datos?.abre) abrir(datos, false, alTerminar);
}
