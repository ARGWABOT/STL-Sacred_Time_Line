// Con qué modelo y cuánto piensa el director, la pestaña «El director» de «Modelo y consumo»: los modelos y los esfuerzos
// que se pueden elegir, lo que dice de cada uno la tabla de Anthropic, con cuál trabajó de verdad el último lanzamiento y
// las casillas de ultracode y de «Todo con el modelo que elegí». Salió de app.ts al partir los módulos grandes
// (propuesta aceptada pr_partir_modulos), como «Lo que gasta» (vistaGasto.ts): recibe lo que pinta y no guarda nada.
import { avisoDelInventario, fichaDe, INVENTARIO, modeloDelInventario } from '../../src/director/modelos';
import { fecha, hora } from './formato';
import { t, type ClaveDeTexto } from './textos';
import { esc } from './util';
import type { Lanzamiento } from './vistaGasto';

/**
 * Los modelos que se pueden elegir para el director, con qué esperar de cada uno: por versión, y los alias de Claude
 * Code, que siguen solos a la más nueva de cada familia. Claude Code no tiene cómo listar desde fuera los que acepta
 * cada plan: si la cuenta no tiene el elegido, la revisión lo dice y el Studio vuelve al de la cuenta.
 */
const opcion = (id: string, nombre: () => string, que: ClaveDeTexto, grupo?: ClaveDeTexto) => ({
  id,
  get nombre() { return nombre(); },
  get que() { return t(que); },
  get grupo() { return grupo ? t(grupo) : undefined; },
});
const POR_VERSION: ClaveDeTexto = 'modelo.dir.porVersion';
const EL_MAS_NUEVO: ClaveDeTexto = 'modelo.dir.masNuevoGrupo';
export const MODELOS: { id: string; nombre: string; que: string; grupo?: string }[] = [
  opcion('', () => t('modelo.dir.deTuCuenta'), 'modelo.dir.cuentaQue'),
  opcion('claude-opus-5-5', () => 'Opus 5.5', 'modelo.dir.opusQue', POR_VERSION),
  opcion('claude-opus-5-5[1m]', () => t('modelo.dir.opus1m'), 'modelo.dir.opus1mQue', POR_VERSION),
  opcion('claude-sonnet-5-5', () => 'Sonnet 5.5', 'modelo.dir.sonnetQue', POR_VERSION),
  opcion('claude-haiku-5-5', () => 'Haiku 5.5', 'modelo.dir.haikuQue', POR_VERSION),
  opcion('claude-fable-5-1', () => 'Fable 5.1', 'modelo.dir.fableQue', POR_VERSION),
  opcion('opus', () => t('modelo.dir.masNuevo', { familia: 'Opus' }), 'modelo.dir.masNuevoOpusQue', EL_MAS_NUEVO),
  opcion('sonnet', () => t('modelo.dir.masNuevo', { familia: 'Sonnet' }), 'modelo.dir.masNuevoSonnetQue', EL_MAS_NUEVO),
  opcion('haiku', () => t('modelo.dir.masNuevo', { familia: 'Haiku' }), 'modelo.dir.masNuevoHaikuQue', EL_MAS_NUEVO),
];

/** Cuánto piensa el director antes de responder (`claude --effort`). */
export const ESFUERZOS: { id: string; nombre: string; que: string }[] = [
  opcion('', () => t('modelo.dir.deTuCuenta'), 'modelo.dir.esfuerzoCuentaQue'),
  opcion('low', () => t('modelo.dir.bajo'), 'modelo.dir.bajoQue'),
  opcion('medium', () => t('modelo.dir.medio'), 'modelo.dir.medioQue'),
  opcion('high', () => t('modelo.dir.alto'), 'modelo.dir.altoQue'),
  opcion('xhigh', () => t('modelo.dir.muyAlto'), 'modelo.dir.muyAltoQue'),
  opcion('max', () => t('modelo.dir.maximo'), 'modelo.dir.maximoQue'),
];

/** El nombre de un modelo: el de la lista o, si no está, el que dice su id («claude-haiku-4-5-20251001» es «Haiku 4.5»). */
export function nombreModelo(id: string) {
  const m = /^claude-([a-z]+)-(\d+)(?:-(\d{1,2}))?(?:-\d{8})?(\[1m\])?$/i.exec(id);
  return MODELOS.find((x) => x.id === id)?.nombre ?? (m ? `${m[1][0].toUpperCase()}${m[1].slice(1)} ${m[2]}${m[3] ? `.${m[3]}` : ''}${m[4] ? t('modelo.dir.contexto1m') : ''}` : id);
}

/** El nombre de un esfuerzo, en minúsculas («máximo»), o su id si no está en la lista. */
export const nombreEsfuerzo = (id: string) => ESFUERZOS.find((e) => e.id === id)?.nombre.toLowerCase() ?? id;

/** Las opciones de un selector, con sus grupos (optgroup) en el orden en que aparecen. */
function opcionesDe(lista: { id: string; nombre: string; grupo?: string }[], actual: string) {
  const op = (m: { id: string; nombre: string }) => `<option value="${esc(m.id)}"${m.id === actual ? ' selected' : ''}>${esc(m.nombre)}</option>`;
  const grupos = [...new Set(lista.map((m) => m.grupo ?? ''))];
  return grupos.map((g) => (g ? `<optgroup label="${esc(g)}">${lista.filter((m) => m.grupo === g).map(op).join('')}</optgroup>` : lista.filter((m) => !m.grupo).map(op).join(''))).join('');
}

/**
 * Lo que dice de Anthropic la tabla de modelos del Studio sobre el elegido, con su fuente y su fecha, y su aviso si no
 * está en ella o si la tabla quedó vieja (pr_modelos_por_tarea, punto 1; opción B, elegida el 28 de octubre de 2026).
 */
function lineaInventario(actual: string, ahora: Date) {
  const m = modeloDelInventario(actual);
  const aviso = avisoDelInventario(actual, ahora);
  return `${m ? `<p class="como inventario-modelo" title="${esc(t('modelo.dir.fuente', { fuente: INVENTARIO.fuente }))}">${t('modelo.dir.segunAnthropic', { fecha: esc(INVENTARIO.fecha) })} ${esc(fichaDe(m))}</p>` : ''}${aviso ? `<p class="aviso-modelo">${esc(aviso)}</p>` : ''}`;
}

/** Lo que la pestaña lee: la configuración de Claude Code en este computador y lo gastado (para saber con cuál trabajó). */
export interface DatosDirector {
  /** El de /model (null: el de la cuenta). */
  modelo: string | null;
  /** El de /effort (null: el de la cuenta), y el que guarda Claude Code para ese modelo (distinto solo con «Máximo»). */
  esfuerzo: string | null;
  esfuerzoGuardado: string | null;
  ultracode: boolean;
  /** Si el titular le dio al director que lanza el Studio el permiso de seguir a ultracode. */
  ultracodeDirector: boolean;
  todoConElModelo: boolean;
  avisoVersionApagado?: boolean;
  /** Los lanzamientos, del más nuevo al más viejo: el primero con modelo dice con cuál trabajó de verdad. */
  consumo: Lanzamiento[];
  /** Ahora: si la tabla de modelos quedó vieja. */
  ahora: Date;
}

/** El permiso del director para seguir a ultracode: si lo tiene, si le falta (con «Darle el permiso») y cómo quitarlo. */
function permisoUltracode(d: DatosDirector) {
  if (d.ultracodeDirector)
    return `<p class="como">${t(d.ultracode ? 'modelo.dir.ultraConPermisoSi' : 'modelo.dir.ultraConPermisoAl')}</p>
        <button type="button" class="boton-suave" data-permiso-ultracode="no">${t('modelo.dir.ultraQuitar')}</button>`;
  if (d.ultracode)
    return `<p class="como">${t('modelo.dir.ultraSinPermiso')}</p>
        <button type="button" class="boton-suave" data-permiso-ultracode="si">${t('modelo.dir.ultraDar')}</button>`;
  return `<p class="como">${t('modelo.dir.ultraSalvo')}</p>`;
}

/** La tarjeta «El director»: el modelo, el esfuerzo, ultracode, «Todo con el modelo que elegí» y la terminal. */
export function seccionDirector(d: DatosDirector) {
  const actual = d.modelo ?? '';
  const elegido = MODELOS.find((m) => m.id === actual);
  const opciones = [...MODELOS, ...(elegido ? [] : [{ id: actual, nombre: actual, que: t('modelo.dir.deLaConfiguracion') }])];
  // Con cuál trabajó de verdad: Claude Code lo dice al empezar cada lanzamiento, y el Studio anota lo que pidió
  const ultimo = d.consumo.find((x) => x.modelo);
  const cuandoUltimo = ultimo ? `${fecha(ultimo.cuando)} ${hora(ultimo.cuando)}` : '';
  const trabajo = !ultimo
    ? `<p class="como">${t('modelo.dir.trabajaAparece')}</p>`
    : ultimo.pedido?.cumplido === false
      ? `<p class="aviso-modelo">${t('modelo.dir.pidioOtro', { cuando: cuandoUltimo, pedido: esc(nombreModelo(ultimo.pedido.modelo ?? '')), real: esc(nombreModelo(ultimo.modelo!)) })}</p>`
      : `<p class="como modelo-real">${t('modelo.dir.trabajoCon', { cuando: cuandoUltimo, real: esc(nombreModelo(ultimo.modelo!)), cual: ultimo.pedido ? t(ultimo.pedido.modelo ? 'modelo.dir.elQueElegiste' : 'modelo.dir.elDeTuCuenta') : '' })}${ultimo.pedido && (ultimo.pedido.modelo ?? '') !== actual ? ` ${t('modelo.dir.seConfirma')}` : ''}</p>`;
  return `
      <section class="panel-d" data-ancla="m-director">
        <h3>${t('modelo.dir.titulo')}</h3>
        <p class="como">${t('modelo.dir.intro')}</p>
        <p><button type="button" class="enlace" data-repasar-instalacion title="${esc(t('asistente.repasarTitulo'))}">${t('asistente.repasar')}</button> · <button type="button" class="enlace" data-ver-instalacion title="${esc(t('asistente.verComoNuevoTitulo'))}">${t('asistente.verComoNuevo')}</button></p>
        <label class="campo-modelo">${t('modelo.dir.modelo')}<select data-modelo>${opcionesDe(opciones, actual)}</select></label>
        <p class="como">${esc(opciones.find((m) => m.id === actual)?.que ?? '')} ${t('modelo.dir.noAcepta')}</p>
        ${lineaInventario(actual, d.ahora)}
        ${trabajo}
        <label class="campo-modelo">${t('modelo.dir.esfuerzo')}<select data-esfuerzo>${opcionesDe(ESFUERZOS, d.esfuerzo ?? '')}</select></label>
        <p class="como">${esc(ESFUERZOS.find((x) => x.id === (d.esfuerzo ?? ''))?.que ?? '')} ${d.esfuerzo === 'max' ? `${t('modelo.dir.maximoExplica', { otro: esc(ESFUERZOS.find((x) => x.id === (d.esfuerzoGuardado ?? ''))?.nombre.toLowerCase() ?? t('modelo.dir.elDeTuCuentaMin')) })} ` : `${t('modelo.dir.cadaModelo')} `}${t('modelo.dir.noCambiaReglas')}</p>
        <label class="interruptor-s"><input type="checkbox" data-ultracode${d.ultracode ? ' checked' : ''} /> Ultracode</label>
        <p class="como">${t('modelo.dir.ultraExplica')}</p>
        ${permisoUltracode(d)}
        <label class="interruptor-s"><input type="checkbox" data-todo-modelo${d.todoConElModelo ? ' checked' : ''} /> ${t('modelo.dir.todoConModelo')}</label>
        <p class="como">${t('modelo.dir.todoExplica')}</p>
        <label class="interruptor-s"><input type="checkbox" data-aviso-version${d.avisoVersionApagado ? '' : ' checked'} /> ${t('modelo.dir.avisoVersion')}</label>
        <p class="como">${t('modelo.dir.avisoVersionExplica')}</p>
        <div class="abrir-claude"><button type="button" class="boton-suave" data-abrir-claude>${t('modelo.dir.abrirClaude')}</button>
          <p class="como">${t('modelo.dir.abrirExplica')}</p></div>
      </section>`;
}
