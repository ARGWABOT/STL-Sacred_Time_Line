// La medición del núcleo, la última tarjeta de «Lo que gasta» en «Modelo y consumo»: la de ahora, con «Detener», o la
// última, con cada caso y su porqué, y lo que gastaría otra. Salió de app.ts al partir los módulos grandes
// (propuesta aceptada pr_partir_modulos), como «Lo que gasta» (vistaGasto.ts): recibe lo que pinta y no guarda nada; lo
// que depende de la página (el nombre de un modelo, lo plegado, si hay un director trabajando) llega hecho.
import type { Alcance as AlcanceMedicion } from '../../src/director/corrida';
import { fecha, hora, miles } from './formato';
import { nombreEsfuerzo, nombreModelo } from './modeloDelDirector';
import { t } from './textos';
import { esc } from './util';

/** La medición del núcleo, como la da el servidor (medidor.ts › estadoDeMedicion). */
export interface EstadoMedicion {
  enMarcha: { quien: string; desde: string; vueltas: number } | null;
  ultima: {
    cuando: string; modelo: string | null; esfuerzo: string | null; terminada: string | null; vueltas: number;
    /** Qué casos midió: los que pasaban, los que fallaban o todos (null: todos, como las de antes). */
    alcance: AlcanceMedicion | null;
    pasan: number; fallan: number; pendientes: number; tokens: number | null;
    /** Solo los casos que midió; `antes`, cómo estaba cada uno en la medición anterior que lo midió. */
    porCaso: { id: string; titulo: string; veredicto: 'pasa' | 'falla' | 'pendiente'; vueltas: number; porque: string[]; califica: { pasa: boolean; porque: string[] } | null; antes: 'pasa' | 'falla' | null }[];
  } | null;
  casos: number;
  /** Los tokens que gastaría otra; sin una corrida, entre lo de un encargo corto del director (`desde`) y lo de una revisión. */
  estimado: { total: number; porVuelta: number; de: 'corrida' | 'revisiones'; desde?: number } | null;
  /** Lo que mediría, gastaría y tardaría cada alcance (nota de voz del titular nmvrimph5tit: no repetir lo que no cambió). */
  alcances?: { alcance: AlcanceMedicion; casos: number; estimado: EstadoMedicion['estimado']; minutos: number | null }[];
  /** Los que fallan, para elegir uno por uno cuáles medir, y lo que gasta y tarda cada caso (nota de voz del titular nmvsgcn7otit). */
  fallan?: { id: string; titulo: string }[];
  unCaso?: { estimado: EstadoMedicion['estimado']; minutos: number | null };
}

/**
 * Lo que gastaría una corrida, en tokens aproximados: por lo que gastó cada vuelta de la última o, sin una, entre lo que
 * gasta un encargo corto del director y lo que gasta una revisión, porque una de prueba queda entre los dos.
 */
export function cuantoGasta(e: NonNullable<EstadoMedicion['estimado']>): string {
  if (e.de === 'corrida') return t('modelo.gastaCorrida', { total: miles(e.total), porVuelta: miles(e.porVuelta) });
  if (e.desde !== undefined) return t('modelo.gastaEntre', { desde: miles(e.desde), total: miles(e.total) });
  return t('modelo.gastaComoMucho', { total: miles(e.total), porVuelta: miles(e.porVuelta) });
}

/** Dónde vive la tarjeta: «Modelo y consumo» › «Lo que gasta» (pestanasModelo.ts; su prueba busca el ancla escrita tal cual). */
export const ANCLA_MEDICION = 'm-medicion';

/**
 * Mientras se mide el núcleo, la cabecera lo dice en lugar de «Pedir revisión», y ese aviso es un atajo a la medición en
 * curso (nota de voz del titular nmvviiwfqtit, 30 de octubre de 2026): un clic lleva a su tarjeta, donde se ve lo que
 * avanza y se detiene. `porque` es lo que dice directorOcupado.
 */
export function avisoMidiendo(porque: string): string {
  return `<button type="button" class="estado-revision ocupado midiendo" data-ver-medicion title="${esc(t('modelo.midiendoClic', { porque }))}">${t('modelo.midiendo')}<span class="puntos" aria-hidden="true"><i></i><i></i><i></i></span></button>`;
}

/** Lo que la tarjeta lee: la medición, si hay un director trabajando o algo pedido que lo lanzará, y lo plegado. */
export interface DatosMedicion {
  medicion: EstadoMedicion | null;
  /** Lo mismo que mira el servidor antes de medir: con un director trabajando o pedido, «Medir el núcleo» espera. */
  directorPendiente: boolean;
  plegable: (clave: string) => string;
}

export function seccionMedicion(d: DatosMedicion) {
  const m = d.medicion;
  if (!m) return '';
  const u = m.ultima;
  const VEREDICTO = { pasa: t('modelo.veredictoPasa'), falla: t('modelo.veredictoFalla'), pendiente: t('modelo.veredictoPendiente') } as const;
  const conQue = (x: { modelo: string | null; esfuerzo: string | null }) => `${x.modelo ? esc(nombreModelo(x.modelo)) : t('modelo.modeloDeTuCuenta')}${x.esfuerzo ? `, ${t('modelo.esfuerzo', { nombre: esc(nombreEsfuerzo(x.esfuerzo)) })}` : ''}`;
  // Lo que no comprueba el código lo califica otro modelo. No se le pide nada a la persona aquí: lo que falla le llega como
  // misión en la revisión siguiente, y si una pauta mide mal, la propuesta de esa misión lo dice (pd_medicion_mision)
  const nota = (c: NonNullable<typeof u>['porCaso'][number]) => (c.califica ? `<small>${t('modelo.quienCalifica', { veredicto: c.califica.pasa ? t('modelo.califPasa') : t('modelo.califFalla'), porque: esc(c.califica.porque.join(' · ')) })}</small>` : '');
  // Cómo estaba cada caso en la medición anterior: lo que pasaba y ahora falla se rompió con el último cambio
  const cambio = (c: NonNullable<typeof u>['porCaso'][number]) => (c.antes === 'pasa' && c.veredicto === 'falla' ? ` · <b>${t('modelo.seRompio')}</b>` : c.antes === 'falla' && c.veredicto === 'pasa' ? ` · ${t('modelo.seArreglo')}` : '');
  const casos = u?.porCaso.length
    ? `<details class="detalles-repo"${d.plegable('medicion-casos')}><summary>${t('modelo.cadaCaso')}</summary><ul class="consumo-lista">${u.porCaso.map((c) => `<li><span>${esc(c.titulo)}</span><span>${VEREDICTO[c.veredicto]}${c.vueltas ? ` · ${t('modelo.vueltas', { n: c.vueltas })}` : ''}${cambio(c)}</span>${c.porque.length ? `<small>${esc(c.porque.join(' · '))}</small>` : ''}${nota(c)}</li>`).join('')}</ul></details>`
    : '';
  const midio = !u || u.porCaso.length >= m.casos ? '' : `${u.alcance === 'pasaban' ? t('modelo.midioPasaban', { n: u.porCaso.length }) : u.alcance === 'fallaban' ? t('modelo.midioFallaban', { n: u.porCaso.length }) : t('modelo.midioDe', { n: u.porCaso.length, total: m.casos })}: `;
  const rotos = u?.porCaso.filter((c) => c.antes === 'pasa' && c.veredicto === 'falla').length ?? 0;
  const ultima = !u
    ? `<p class="como">${t('modelo.sinMedir')}</p>`
    : `<p class="como">${t('modelo.ultimaCabeza', { cual: m.enMarcha ? t('modelo.estaMedicion') : u.terminada ? t('modelo.laUltima') : t('modelo.laUltimaDetenida'), cuando: `${fecha(u.cuando)} ${hora(u.cuando)}`, conQue: conQue(u) })} ${midio}<b>${t('modelo.casosPasan', { pasan: u.pasan, total: u.porCaso.length })}</b>${u.fallan ? `, ${t('modelo.casosFallan', { n: u.fallan })}` : ''}${rotos ? ` (${t('modelo.rotos', { n: rotos })})` : ''}${u.tokens != null ? ` · ${miles(u.tokens)} tokens` : ''}.</p>${casos}`;
  const e = m.estimado;
  // Con una medición anterior, lo que ya pasa no se vuelve a correr: se eligen al pedirla, uno por uno, los que fallan
  const fallan = m.fallan?.length ?? 0;
  const consumo = u
    ? t('modelo.consumoConUltima', { cuales: t('modelo.consumoCuales', { n: fallan }), ahora: fallan ? '' : ` ${t('modelo.ahoraNinguno')}` })
    : e
      ? t('modelo.consumoEstimado', { casos: m.casos, gasta: cuantoGasta(e), tokens: miles(e.porVuelta) })
      : t('modelo.consumoSinEstimado', { casos: m.casos });
  const accion = m.enMarcha
    ? `<p class="como">${t('modelo.enMarcha', { n: m.enMarcha.vueltas, hora: hora(m.enMarcha.desde), quien: esc(m.enMarcha.quien) })}</p>
        <div class="abrir-claude"><button type="button" class="boton-suave" data-medir="detener">${t('modelo.detener')}</button><p class="como">${t('modelo.detenerExplica')}</p></div>`
    : `<div class="abrir-claude"><button type="button" class="boton-suave" data-medir="pedir"${d.directorPendiente ? ` disabled title="${t('modelo.medirEspera')}"` : ''}>${t('modelo.medirNucleo')}</button><p class="como">${consumo}</p></div>`;
  return `<section class="panel-d" data-ancla="m-medicion">
      <h3>${t('modelo.medicionTitulo')}</h3>
      <p class="como">${t('modelo.medicionIntro')}</p>
      ${ultima}
      ${accion}
      <p class="como">${t('modelo.medicionGasta')}</p>
    </section>`;
}
