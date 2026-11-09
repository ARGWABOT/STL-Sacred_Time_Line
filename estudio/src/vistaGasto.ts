// Lo que gasta el director, la pestaña «Lo que gasta» de «Modelo y consumo»: los límites de tu plan, las cifras de hoy y de
// la semana y la tabla de la medida del director. Cada revisión se consulta en la línea en grande (nota de voz del titular
// nmvznzcnstit, 2 de noviembre de 2026: aquí ya no va la lista de cada lanzamiento). Salió de app.ts al partir los módulos
// grandes (propuesta aceptada pr_partir_modulos), como las vistas de apoyo: recibe lo que pinta y no guarda nada; lo que
// depende de la página (el nombre de un proyecto, lo plegado) llega hecho.
import { semanaDeCadaUno } from '../../src/director/consumoDelPlan';
import type { MedidaDeRevision } from '../../src/director/historial';
import { fecha, hora, miles } from './formato';
import { lenguaje, t } from './textos';
import { esc } from './util';

/** Lo que gastó un lanzamiento del director en este computador (estudio/servidor/revisor.ts › consumoDeRevisiones). */
export interface Lanzamiento {
  cuando: string; proyecto: string; tipo: 'revision' | 'aclaracion' | 'urgencia'; modelo: string | null; entrada: number; cache: number; salida: number;
  /** Lo que se le pidió y si trabajó con eso: lo dice «El director» (modeloDelDirector.ts). */
  pedido?: { modelo: string | null; esfuerzo: string | null; cumplido?: boolean | null };
  limites: { cincoHoras: { uso: number; renueva: string | null } | null; semana: { uso: number; renueva: string | null } | null } | null;
  /** Lo que se le negó en ese lanzamiento: las herramientas y órdenes que sus permisos no le dejaron. */
  negados?: string[];
  /** Tu límite semanal al empezar y al terminar: lo que subió es la parte de tu semana que gastó (consumoDelPlan.ts). */
  semana?: { desde: number; hasta: number; renueva: string | null };
}

/** Lo que la pestaña lee: lo gastado en este computador y la medida del director, más lo que depende de la página. */
export interface DatosGasto {
  consumo: Lanzamiento[];
  medida: MedidaDeRevision[];
  /** Ahora: lo de hoy, lo de los últimos 7 días y si un límite ya se renovó. */
  ahora: Date;
  nombreProyecto: (id: string) => string;
  /** Los atributos de un plegable, como lo dejó la persona. */
  plegable: (clave: string) => string;
}

const SIETE_DIAS = 7 * 86_400_000;

/**
 * La parte de tu semana que gastó algo, aproximada, en el idioma de ahora: lo mismo que consumoDelPlan.ts › enTuPlan, que
 * solo habla español (la regla del titular: nunca dinero, solo tokens y la parte del plan, y dicha aproximada).
 */
export function enTuPlanTexto(puntos: number | undefined): string | null {
  if (puntos === undefined) return null;
  const pct = puntos < 0.1 ? t('modelo.menosDeUnDecimo') : t('formato.pct', { n: puntos.toLocaleString(lenguaje(), { maximumFractionDigits: 1 }) });
  return t('modelo.deTuSemana', { pct });
}

/** Las dos tarjetas de la pestaña, una encima de la otra: los límites de tu plan y lo que gastó el director. */
export function seccionGasto(d: DatosGasto) {
  const lista = d.consumo;
  const { nombreProyecto } = d;
  const ahora = d.ahora.getTime();
  const dia = (x: Date) => `${x.getFullYear()}-${x.getMonth() + 1}-${x.getDate()}`;
  // Solo uso, nunca dinero (regla del titular, nota nmvx46phftit): los tokens, que dice Claude Code, y la parte de tu semana
  // que gastó cada lanzamiento, repartida en cada ventana en proporción a sus tokens, aproximada
  const idDe = (x: Lanzamiento) => `${x.tipo}|${x.proyecto}|${x.cuando}`;
  const tokensDe = (x: Lanzamiento) => x.entrada + x.cache + x.salida;
  const deTuSemana = semanaDeCadaUno(lista.map((x) => ({ id: idDe(x), tokens: tokensDe(x), semana: x.semana })));
  const suma = (xs: Lanzamiento[]) => ({ n: xs.length, tokens: xs.reduce((s, x) => s + tokensDe(x), 0), negados: xs.reduce((s, x) => s + (x.negados?.length ?? 0), 0), ...(xs.some((x) => deTuSemana.has(idDe(x))) ? { semana: xs.reduce((s, x) => s + (deTuSemana.get(idDe(x)) ?? 0), 0) } : {}) });
  const negadosDe = (n: number) => t('modelo.permisosNegados', { n });
  const deHoy = suma(lista.filter((x) => dia(new Date(x.cuando)) === dia(d.ahora)));
  const semana = lista.filter((x) => ahora - Date.parse(x.cuando) < SIETE_DIAS);
  const deSemana = suma(semana);
  // La parte de tu semana, si la dijo tu límite; sin ella, solo los tokens
  const deTuPlan = (puntos: number | undefined) => esc(enTuPlanTexto(puntos) ?? t('modelo.sinSemana'));
  const cifra = (titulo: string, s: ReturnType<typeof suma>) => `<div><span class="tit">${titulo}</span><b>${deTuPlan(s.semana)}</b><small>${t('modelo.lanzamientos', { n: s.n })} · ${miles(s.tokens)} tokens${s.negados ? ` · ${negadosDe(s.negados)}` : ''}</small></div>`;
  // Lo de cada proyecto en la semana, del que más gastó al que menos: solo si el director trabajó en más de uno
  const porProyecto = [...new Set(semana.map((x) => x.proyecto))].map((id) => ({ id, ...suma(semana.filter((x) => x.proyecto === id)) })).sort((a, b) => b.tokens - a.tokens);
  // La medida del criterio del director en este proyecto, por revisión (pr_criterio_director, punto 3): lo que salió de lo
  // que dejó cada una, para que se vean sus fallas y si mejora
  const medida = d.medida;
  const celda = (n: number) => `<td${n ? ' class="hay"' : ''}>${n.toLocaleString(lenguaje())}</td>`;
  // Cuánto tardó cada uno, que queda sin límite en el resumen de cada revisión; al pasar el ratón, cada corrida de pruebas
  const minDe = (ms: number) => `${Math.round(ms / 60_000).toLocaleString(lenguaje())} min`;
  const celdaTiempos = (x: MedidaDeRevision['tiempos']) => (x
    ? `<td title="${esc(x.pruebas.map((p) => `${p.orden}: ${Math.round(p.ms / 1000).toLocaleString(lenguaje())} s${p.fallo ? ` (${t('modelo.fallo')})` : ''}`).join('\n'))}">${minDe(x.modeloMs + (x.planMs ?? 0))} / ${minDe(x.computadorMs)}</td>`
    : '<td>—</td>');
  const tablaMedida = medida.length
    ? `<details class="detalles-repo"${d.plegable('consumo-medida')}><summary>${t('modelo.medidaTitulo')}</summary>
        <table class="tabla-medida"><thead><tr><th>${t('modelo.colRevision')}</th><th>${t('modelo.colCerro')}</th><th>${t('modelo.colTokens')}</th><th>${t('modelo.colModeloComputador')}</th><th>${t('modelo.colTalCual')}</th><th>${t('modelo.colCambiadas')}</th><th>${t('modelo.colRehacer')}</th><th>${t('modelo.lanzAclaracion')}</th></tr></thead>
          <tbody>${medida.map((m) => `<tr><td>${fecha(m.cuando)} ${hora(m.cuando)}</td><td>${m.cerro ? t('modelo.si') : `<b>${t('modelo.no')}</b>`}</td><td>${m.tokens != null ? miles(m.tokens) : '—'}</td>${celdaTiempos(m.tiempos)}<td>${m.talCual.toLocaleString(lenguaje())}</td>${celda(m.cambiadas)}${celda(m.rehacer)}${celda(m.aclaraciones)}</tr>`).join('')}</tbody></table>
        <p class="como">${t('modelo.medidaComo')}</p>
      </details>`
    : '';
  // Los límites del plan, como los muestra /usage: Claude Code los informa en cada lanzamiento
  const conLimites = lista.find((x) => x.limites);
  const ventana = (titulo: string, v: { uso: number; renueva: string | null } | null) => {
    if (!v) return '';
    if (v.renueva && Date.parse(v.renueva) < ahora) return `<div><span class="tit">${titulo}</span><b>${t('modelo.renovado')}</b><small>${t('modelo.seRenovo', { fecha: fecha(v.renueva), hora: hora(v.renueva) })}</small></div>`;
    return `<div><span class="tit">${titulo}</span><b>${t('modelo.usado', { pct: t('formato.pct', { n: v.uso.toLocaleString(lenguaje()) }) })}</b><small>${v.renueva ? t('modelo.seRenueva', { fecha: fecha(v.renueva), hora: hora(v.renueva) }) : ''}</small></div>`;
  };
  const limites = conLimites?.limites
    ? `<div class="consumo-cifras">${ventana(t('modelo.cadaCincoHoras'), conLimites.limites.cincoHoras)}${ventana(t('modelo.semanal'), conLimites.limites.semana)}</div>
        <p class="como">${t('modelo.limitesDe', { cuando: `${fecha(conLimites.cuando)} ${hora(conLimites.cuando)}` })}</p>`
    : `<p class="como">${t('modelo.limitesSin')}</p>`;
  // Los límites y lo gastado, dos tarjetas de todo el ancho, una encima de la otra (nota de voz del titular
  // nmvow70jqtit, 26 de octubre de 2026: en vez de una pequeña y otra a la derecha)
  return `
      <section class="panel-d" data-ancla="m-limites">
        <h3>${t('modelo.limitesTitulo')}</h3>
        ${limites}
        <p class="como">${t('modelo.limitesAproximado')}</p>
      </section>
      <section class="panel-d" data-ancla="m-consumo">
        <h3>${t('modelo.gastoTitulo')}</h3>
        ${lista.length ? `<div class="consumo-cifras">${cifra(t('modelo.hoy'), deHoy)}${cifra(t('modelo.ultimos7'), deSemana)}</div>
          ${porProyecto.length > 1 ? `<ul class="consumo-proyectos" aria-label="${t('modelo.porProyecto')}">${porProyecto.map((p) => `<li><span>${esc(nombreProyecto(p.id))}</span><span>${p.semana !== undefined ? `${deTuPlan(p.semana)} · ` : ''}${miles(p.tokens)} tokens · ${t('modelo.lanzamientos', { n: p.n })}</span></li>`).join('')}</ul>` : ''}` : `<p class="como">${t('modelo.sinLanzamientos')}</p>`}
        ${tablaMedida}
        <p class="como">${t('modelo.gastoNota1')}</p>
        <p class="como">${t('modelo.gastoNota2')}</p>
        <p class="como">${t('modelo.gastoNota4')}</p>
      </section>`;
}
