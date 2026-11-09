// La pantalla de la voz del asistente de instalación (pedido pd_valores_instalar), por zonas: la transcripción, obligatoria y
// con su avance; la prueba del micrófono, con la frase a la vista; y las voces, también obligatorias. Cada zona se pinta aparte: lo que
// avanza una descarga no toca la grabación en curso. Lo que decide está en src/director/instalacionVoz.ts; lo que corre, en
// estudio/servidor/instalarVoz.ts; aquí, solo lo que se ve. Puro, salvo el idioma.
import { ESPACIO_NECESARIO, respuestasDePrueba, type EstadoVoz, type Instalacion, type QueInstala, type ResultadoPrueba } from '../../src/director/instalacionVoz';
import { t } from './textos';
import { esc } from './util';

/** Cómo va la prueba del micrófono: grabando (o por grabar), transcribiendo, o con lo que entendió; `intentos`, cuántas grabaciones llevó. */
export interface PruebaMic {
  fase: 'grabar' | 'transcribiendo' | 'entendio' | 'fallo';
  intentos: number;
  entendido?: string;
  error?: string;
}
export const PRUEBA_NUEVA: PruebaMic = { fase: 'grabar', intentos: 0 };

/** Lo que la pantalla recuerda de lo elegido. */
export interface EleccionVoz {
  prueba?: ResultadoPrueba;
}

const ORDENES: Record<QueInstala, string> = { transcripcion: 'bash tools/entorno/instalar_transcripcion.sh', voces: 'bash tools/entorno/instalar_voces.sh' };

function barra(i: Instalacion): string {
  const pct = i.pct ?? 0;
  return `<progress max="100" value="${pct}"></progress><p class="como" role="status">${t('asistente.voz.instalando', { pct })}</p>`;
}

/** Por qué falló, con cómo arreglarlo: dice si fue internet o espacio (t_decide_transcripcion_sin_internet). */
function textoDeFalla(i: Instalacion, que: QueInstala): string {
  if (i.causa === 'internet') return t('asistente.voz.fallaInternet');
  if (i.causa === 'espacio') return t('asistente.voz.fallaEspacio', { gb: Math.ceil(ESPACIO_NECESARIO[que] / 1e9) });
  return t('asistente.voz.fallaOtra', { detalle: i.detalle ? t('asistente.voz.fallaDetalle', { detalle: i.detalle }) : '', orden: ORDENES[que] });
}

const reintentar = (que: QueInstala) => `<button type="button" class="primario" data-asistente-instalar="${que}">${t('asistente.voz.reintentar')}</button>`;

/** La transcripción: obligatoria, sin casilla y sin camino para saltarla; si falla, solo «Reintentar». */
export function zonaTranscripcion(v: EstadoVoz | null, repaso: boolean): string {
  const titulo = `<h3>${t('asistente.voz.transTitulo')}</h3>`;
  if (!v) return `${titulo}<p class="como" role="status">${t('asistente.voz.mirando')}</p>`;
  const i = v.transcripcion;
  if (i.estado === 'lista') return `${titulo}<p class="asistente-ok" role="status">✓ ${t('asistente.voz.transLista')}</p>`;
  if (i.estado === 'instalando') return `${titulo}${barra(i)}`;
  if (i.estado === 'fallo') return `${titulo}<div class="aviso asistente-falta" role="alert"><p>${esc(textoDeFalla(i, 'transcripcion'))}</p><div>${reintentar('transcripcion')}</div></div>`;
  return `${titulo}<p class="como">${t('asistente.voz.transPeso')}</p>${repaso ? `<div><button type="button" data-asistente-instalar="transcripcion">${t('asistente.voz.instalar')}</button></div>` : `<progress max="100" value="0"></progress>`}`;
}

/** La prueba del micrófono: con la frase a la vista mientras se graba; cuenta cuando la persona dice que se entendió (t_decide_prueba_cuenta). */
export function zonaPrueba(e: EleccionVoz, p: PruebaMic, v: EstadoVoz | null): string {
  const titulo = `<h3>${t('asistente.voz.pruebaTitulo')}</h3>`;
  if (v?.transcripcion.estado !== 'lista') return `${titulo}<p class="como">${t('asistente.voz.pruebaEspera')}</p>`;
  if (e.prueba) {
    const dice = e.prueba === 'bien' ? 'asistente.voz.pruebaBien' : e.prueba === 'sigo' ? 'asistente.voz.pruebaSigo' : 'asistente.voz.pruebaSinMic';
    return `${titulo}<p class="asistente-ok" role="status">✓ ${t(dice)}</p><div><button type="button" class="enlace" data-asistente-prueba="otra">${t('asistente.voz.probarOtra')}</button></div>`;
  }
  const frase = `<blockquote class="asistente-frase" data-asistente-frase>${t('asistente.voz.frase')}</blockquote>`;
  const sinMic = `<button type="button" data-asistente-prueba="sin_mic">${t('asistente.voz.sinMic')}</button>`;
  if (p.fase === 'transcribiendo') return `${titulo}${frase}<p class="como" role="status">${t('asistente.voz.transcribiendo')}</p>`;
  if (p.fase === 'entendio') {
    const boton = { bien: `<button type="button" class="primario" data-asistente-prueba="bien">${t('asistente.voz.si')}</button>`, otra: `<button type="button" data-asistente-prueba="otra">${t('asistente.voz.grabarOtra')}</button>`, sigo: `<button type="button" data-asistente-prueba="sigo">${t('asistente.voz.sigo')}</button>` };
    return `${titulo}${frase}<p>${t('asistente.voz.entendio')}</p><blockquote class="asistente-entendido">${esc(p.entendido ?? '')}</blockquote><p><b>${t('asistente.voz.seEntendio')}</b></p><div class="botones asistente-prueba-botones">${respuestasDePrueba(p.intentos).map((r) => boton[r]).join('')}${sinMic}</div>`;
  }
  if (p.fase === 'fallo') return `${titulo}${frase}<div class="aviso asistente-falta" role="alert"><p>${esc(p.error ?? '')}</p><div class="botones asistente-prueba-botones"><button type="button" class="primario" data-asistente-prueba="otra">${t('asistente.voz.reintentar')}</button>${sinMic}</div></div>`;
  return `${titulo}<p>${t('asistente.voz.pruebaLee')}</p>${frase}<div class="grabadora" data-asistente-grabadora></div><div class="botones asistente-prueba-botones">${sinMic}</div>`;
}

/**
 * Las voces: obligatorias, como la transcripción (notas de voz del titular nmvzfmvr2tit y nmvzfsccjtit, 2 de noviembre de
 * 2026): sin casilla, se bajan solas al terminar ella y, si fallan, solo «Reintentar». Quitarlas es desinstalar el Studio.
 */
export function zonaVoces(v: EstadoVoz | null, repaso: boolean): string {
  const titulo = `<h3>${t('asistente.voz.vocesTitulo')}</h3><p class="como">${t('asistente.voz.vocesQue')}</p>`;
  if (!v) return titulo;
  const i = v.voces;
  if (i.estado === 'lista') return `${titulo}<p class="asistente-ok" role="status">✓ ${t('asistente.voz.vocesListas')}</p>`;
  if (i.estado === 'instalando') return `${titulo}${barra(i)}`;
  if (i.estado === 'fallo') return `${titulo}<div class="aviso asistente-falta" role="alert"><p>${esc(textoDeFalla(i, 'voces'))}</p><div>${reintentar('voces')}</div></div>`;
  return `${titulo}${repaso ? `<div><button type="button" data-asistente-instalar="voces">${t('asistente.voz.instalar')}</button></div>` : `<p class="como">${t('asistente.voz.vocesEspera')}</p>`}`;
}

/** La pantalla entera. */
export function cuerpoVoz(e: EleccionVoz, v: EstadoVoz | null, p: PruebaMic, repaso: boolean): string {
  return `<p>${t('asistente.vozQue')}</p>
    <section data-voz-transcripcion>${zonaTranscripcion(v, repaso)}</section>
    <section data-voz-prueba>${zonaPrueba(e, p, v)}</section>
    <section data-voz-voces>${zonaVoces(v, repaso)}</section>`;
}
