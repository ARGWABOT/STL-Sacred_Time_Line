// La vista «La ruta»: una fase con sus pestañas (la fase, sus misiones, lo pedido y las propuestas). Salió de app.ts
// al partir los módulos grandes (propuesta aceptada pr_partir_modulos), como «Proyecto» (vistaProyecto.ts): recibe lo que
// pinta y no guarda nada; la pestaña que recuerda cada fase, la barra de la ruta, el tablero, la puerta, los criterios, las
// propuestas y las misiones pasadas los pinta la página y se los da ya pintados o como función.
import {
  aprobadasDeFase,
  aprobadoAntesDelCierre,
  DESPUES,
  estadoMision,
  nombreDeLoQueEspera,
  origenDePrevista,
  pedidosAntesDelCierre,
  reemplazos,
  situacion,
  type Criterio,
  type EstadoDirector,
  type EstadoMision,
  type Fase,
  type Mision,
  type Pedido,
  type Persona,
  type Plan,
  type Propuesta,
} from '../../src/director/director';
import { momento } from './formato';
import { conAyuda } from './palabras';
import { t } from './textos';
import { separarHechas } from './hechoAparte';
import { pestanasRutaVisibles, tituloPestanaRuta, type PestanaRuta } from './pestanasRuta';
import { esc } from './util';

export const NOMBRE_SITUACION = {
  get superada() { return t('ruta.superada'); },
  get actual() { return t('ruta.actual'); },
  get futura() { return t('ruta.futura'); },
};
export const NOMBRE_ESTADO_MISION: Record<EstadoMision, string> = {
  get bloqueada() { return t('estado.bloqueada'); },
  get pendiente() { return t('estado.porHacer'); },
  get en_curso() { return t('estado.porHacer'); },
  get entregada() { return t('estado.entregada'); },
  get aprobada() { return t('estado.aprobada'); },
  get rehacer() { return t('estado.rehacer'); },
};

/** Lo que pinta la vista. La página se lo da con sus datos y con lo que depende de ella. */
export interface DatosRuta {
  plan: Plan;
  estado: EstadoDirector;
  /** La fase que se mira. */
  fase: Fase;
  /** Si la ruta ya llegó a esa fase: de una futura solo se dice cuántas misiones y propuestas trae. */
  abierta: boolean;
  /** El nombre del titular, que tiene la última palabra en cada criterio. */
  titular: string;
  /** El equipo, en su orden, con sus nombres. */
  personas: { id: Persona; nombre: string }[];
  /** Elige la pestaña entre las que se ven: la página recuerda la de cada fase y un ancla pendiente la cambia. */
  elegir: (visibles: PestanaRuta[]) => PestanaRuta;
  /** La barra de la ruta y el tablero de la fase, ya pintados por la página. */
  rutaHTML: string;
  tableroFase: string;
  pintarPuerta: (f: Fase) => string;
  filaCriterio: (c: Criterio, f: Fase) => string;
  listaDePropuestas: (lista: Propuesta[]) => string;
  misionPasada: (m: Mision) => string;
  /** Si un plegable nace abierto (lo recuerda la página). */
  plegable: (clave: string) => string;
}

/**
 * El estado de lo que otro pedido o propuesta reemplazó (`reemplazos`, pd_lo_vigente): cerrado sin hacerse, con el nombre
 * de lo que lo reemplazó al pasar el ratón.
 */
export function chipReemplazado(plan: Plan, por: string) {
  return `<span class="chip" title="${esc(t('ruta.loReemplazo', { que: nombreDeLoQueEspera(plan, por) }))}">${t('ruta.reemplazado')}</span>`;
}

/**
 * Lo por hacer y lo hecho de una lista de «La ruta», cada uno en su `<ul>` y con su subtítulo solo si hay de los dos
 * (notas de voz del titular, 26 de octubre de 2026): lo por hacer hacia adelante, lo hecho de lo más nuevo a lo más viejo.
 */
export function partesPorHacerYHechas(porHacer: string[], hechas: string[], tituloPorHacer: string, tituloHechas: string) {
  const ambas = porHacer.length > 0 && hechas.length > 0;
  return `${porHacer.length ? `${ambas ? `<h4 class="sub-hechas">${tituloPorHacer}</h4>` : ''}<ul class="adelantado">${porHacer.join('')}</ul>` : ''}${hechas.length ? `${ambas ? `<h4 class="sub-hechas">${tituloHechas}</h4>` : ''}<ul class="adelantado">${hechas.join('')}</ul>` : ''}`;
}

/**
 * El estado de una misión prevista de la fase, calculado de lo que nombra (origenDePrevista, «El plan liviano», punto 3):
 * «Hecho», «Por hacer» o cuántos de sus pedidos, propuestas y misiones están hechos. Lo que no nombra nada, sin chip.
 */
function chipDePrevista(plan: Plan, estado: EstadoDirector, texto: string): string {
  const { ids, hechos } = origenDePrevista(texto, plan, estado);
  if (!ids.length) return '';
  if (hechos.length === ids.length) return ` <span class="chip">${t('ruta.hecho')}</span>`;
  return hechos.length ? ` <span class="chip espera">${t('ruta.deHechos', { hechos: hechos.length, total: ids.length })}</span>` : ` <span class="chip espera">${t('ruta.porHacer')}</span>`;
}

export function vistaRuta(datos: DatosRuta) {
  const { plan, estado, fase: f, abierta, filaCriterio, pintarPuerta, listaDePropuestas, misionPasada, plegable } = datos;
  const s = situacion(plan, estado, f.id);
  const numeroFase = (x: Fase) => plan.fases.indexOf(x);
  const nombreFrente = (id: string) => plan.frentes.find((x) => x.id === id)?.nombre ?? id;
  const adelantado = plan.adelantado.filter((a) => a.fase === f.id);
  // De una fase futura solo se dice cuántas misiones y propuestas trae: se abren al llegar. Lo que ya aprobaste para ella
  // sí se ve, con su estado: está decidido y programado ahí, como lo pedido (notas de voz del titular, 22 de octubre de 2026)
  const propuestas = abierta ? plan.propuestas.filter((p) => p.fase === f.id) : [];
  const misiones = abierta ? plan.misiones.filter((m) => m.fase === f.id) : [];
  const aprobadas = abierta ? [] : aprobadasDeFase(plan, estado, f.id);
  const cerradas = abierta ? 0 : plan.misiones.filter((m) => m.fase === f.id).length + plan.propuestas.filter((p) => p.fase === f.id).length - aprobadas.length;
  // Lo aceptado en una fase ya cruzada y sin hacer se ve en la fase en curso: no se pierde de vista (nota de voz del
  // titular, 22 de octubre de 2026)
  const heredadas = s === 'actual' ? aprobadoAntesDelCierre(plan, estado, f.id).filter((p) => p.fase !== f.id) : [];
  // Lo pedido en las notas, con su estado: lo de esta fase y, en la fase en curso, lo que quedó sin hacer de antes. Se ve
  // también en una fase futura: es lo que pediste, programado ahí, no trabajo que se decida antes de tiempo (notas de voz
  // del titular, 22 de octubre de 2026: «tienen que quedar registradas en la ruta futura»)
  const pedidos = [...(s === 'actual' ? pedidosAntesDelCierre(plan, f.id).filter((p) => p.fase !== f.id) : []), ...(plan.pedidos ?? []).filter((p) => p.fase === f.id)];
  // Lo reemplazado ya no es trabajo: se ve cerrado, con lo que lo reemplazó (pd_lo_vigente)
  const reemplazado = reemplazos(plan);
  const porHacer = pedidos.filter((p) => !p.hecho && !reemplazado.has(p.id)).length;
  // Lo de después del lanzamiento, al final de la última fase: a la vista y con su estado, sin detener ninguna puerta
  // (decisión del titular, 22 de octubre de 2026)
  const despues = plan.fases.at(-1)?.id === f.id ? (plan.pedidos ?? []).filter((p) => p.fase === DESPUES) : [];
  const filaPedido = (p: Pedido) => `<li data-ancla="pedido-${esc(p.id)}">${esc(p.texto)} ${p.hecho ? `<span class="chip" title="${esc(p.hecho.nota)}">${t('ruta.hecho')}</span> <span class="como cuando-hecha">${momento(p.hecho.cuando)}</span>` : reemplazado.has(p.id) ? chipReemplazado(plan, reemplazado.get(p.id)!) : `<span class="chip espera">${t('ruta.porHacer')}</span>`}</li>`;
  // Lo por hacer hacia adelante y lo hecho aparte, lo más nuevo arriba, con la fecha y la hora en que se hizo
  const listaDePedidos = (lista: Pedido[]) => {
    const { porHacer: pendientes, hechas } = separarHechas(lista, (p) => !!p.hecho || reemplazado.has(p.id), (p) => p.hecho?.cuando);
    return partesPorHacerYHechas(pendientes.map(filaPedido), hechas.map(filaPedido), t('ruta.porHacer'), t('ruta.hechos'));
  };
  // Cada fase se parte en pestañas de ancho completo, las mismas en todas, cada una con lo que tenga (pd_ruta_pestanas); un
  // botón que lleva a un pedido, una propuesta o una misión abre antes la pestaña que lo tiene
  const cuentas = { misiones: misiones.length, pedidos: pedidos.length + despues.length, propuestas: propuestas.length + aprobadas.length + heredadas.length };
  const visibles = pestanasRutaVisibles(cuentas);
  const elegida = datos.elegir(visibles);
  // Solo se pinta la pestaña elegida: lo demás no está en la página
  const cuerpos: Record<PestanaRuta, () => string> = {
    fase: () => `<div class="panel-d">
        <h2>${t('ruta.fase', { n: numeroFase(f), nombre: esc(f.nombre) })}${conAyuda('fase')} <span class="chip">${NOMBRE_SITUACION[s]}</span></h2>
        <div class="como">${esc(f.etapa)} · ${esc(f.duracion)}</div>
        <p class="texto-fase">${esc(f.meta)}</p>
        <p class="por-que"><b>${t('ruta.porQueVaAqui')}</b> ${esc(f.porQue)}</p>
        <h3>${t('ruta.paraCruzar')}${conAyuda('criterio')}</h3>
        <p class="como">${t('ruta.losEvalua', { titular: esc(datos.titular) })}</p>
        <ul class="criterios">${f.criterios.map((c) => filaCriterio(c, f)).join('')}</ul>
        ${pintarPuerta(f)}
      </div>
      ${cerradas ? `<div class="panel-d"><h3>${t('ruta.futura')}</h3><p class="como">${t('ruta.esperanFase', { n: cerradas })}</p></div>` : ''}
      <div class="panel-d" data-ancla="r-plan"><h3>${t('ruta.planFase')}</h3><ol class="misiones">${f.misiones.map((m) => `<li>${esc(m)}${chipDePrevista(plan, estado, m)}</li>`).join('')}</ol></div>
      ${adelantado.length ? `<div class="panel-d"><h3>${t('ruta.adelantado')}${conAyuda('frente')}</h3><ul class="adelantado">${adelantado.map((a) => `<li><b>${esc(nombreFrente(a.frente))}:</b> ${esc(a.texto)}</li>`).join('')}</ul></div>` : ''}
      ${plan.fases.length <= 1 ? `<div class="panel-d"><h3>${t('ruta.resto')}</h3><p class="como">${t('ruta.restoTexto')}</p></div>` : ''}`,
    misiones: () => `${misiones.length ? `<div class="panel-d" data-ancla="r-misiones"><h3>${t('ruta.misionesFase')}</h3>${misiones.some((m) => estadoMision(m, plan, estado) === 'aprobada') ? `<p class="como">${t('ruta.aprobadasSeAbren')}</p>` : ''}${datos.personas.map((p) => {
        const ms = misiones.filter((m) => m.para === p.id);
        // Lo por hacer, en el orden del plan; lo aprobado aparte, lo más nuevo arriba, con la fecha y la hora en que se aprobó
        const { porHacer: pendientes, hechas } = separarHechas(ms, (m) => estadoMision(m, plan, estado) === 'aprobada', (m) => plan.revisiones[m.id]?.cuando);
        const fila = (m: Mision) => {
          const e = estadoMision(m, plan, estado);
          const chip = `<span class="chip estado-m ${e}">${NOMBRE_ESTADO_MISION[e]}</span>`;
          const cuando = plan.revisiones[m.id]?.cuando;
          return e === 'aprobada'
            ? `<li><details class="mision-pasada" data-ancla="pasada-${esc(m.id)}"${plegable(`pasada|${m.id}`)}><summary>${esc(m.titulo)} ${chip}${cuando ? ` <span class="como cuando-hecha">${momento(cuando)}</span>` : ''}</summary>${misionPasada(m)}</details></li>`
            : `<li>${esc(m.titulo)} ${chip}</li>`;
        };
        return ms.length ? `<p class="como"><b>${esc(p.nombre)}</b></p>${partesPorHacerYHechas(pendientes.map(fila), hechas.map(fila), t('ruta.porHacer'), t('ruta.aprobadas'))}` : '';
      }).join('')}</div>` : ''}`,
    pedidos: () => `${pedidos.length ? `<div class="panel-d" data-ancla="r-pedidos"><h3>${t('ruta.pedidoFase')}${conAyuda('pedido')} <span class="chip${porHacer ? ' espera' : ''}">${porHacer ? t('ruta.nPorHacer', { n: porHacer, total: pedidos.length }) : t('ruta.todoHecho')}</span></h3><p class="como">${abierta ? t('ruta.pedidosAbierta') : t('ruta.pedidosFutura')}</p>${listaDePedidos(pedidos)}</div>` : ''}
      ${despues.length ? `<div class="panel-d" data-ancla="r-despues"><h3>${t('ruta.despues')}</h3><p class="como">${t('ruta.despuesTexto')}</p>${listaDePedidos(despues)}</div>` : ''}`,
    propuestas: () => `${aprobadas.length ? `<div class="panel-d" data-ancla="r-aprobadas"><h3>${t('ruta.aprobasteFase')}${conAyuda('propuesta')}</h3><p class="como">${t('ruta.aprobasteTexto')}</p>${listaDePropuestas(aprobadas)}</div>` : ''}
      ${propuestas.length ? `<div class="panel-d"><h3>${t('ruta.propuestasFase')}${aprobadas.length ? '' : conAyuda('propuesta')}</h3><p class="como">${t('ruta.propuestasTexto')}</p>${listaDePropuestas(propuestas)}</div>` : ''}
      ${heredadas.length ? `<div class="panel-d"><h3>${t('ruta.heredadas')}</h3><p class="como">${t('ruta.heredadasTexto')}</p>${listaDePropuestas(heredadas)}</div>` : ''}`,
  };
  // Cada cuenta va en su pestaña («Misiones (12)»); la de «La fase» no cuenta nada: siempre está
  const barra = `<div class="pestanas-stl pestanas-ruta" role="tablist" aria-label="${t('ruta.fase', { n: numeroFase(f), nombre: esc(f.nombre) })}">${visibles.map((id) => {
    const sel = id === elegida;
    const n = id === 'fase' ? null : cuentas[id];
    return `<button type="button" role="tab" id="pestana-ruta-${id}" class="pestana-stl${sel ? ' sel' : ''}" data-pestana-ruta="${id}" data-fase-de-pestana="${esc(f.id)}" aria-selected="${sel}"${sel ? ` aria-controls="panel-ruta-${id}"` : ''} tabindex="${sel ? 0 : -1}">${esc(tituloPestanaRuta(id))}${n === null ? '' : ` (${n})`}</button>`;
  }).join('')}</div>`;
  return `${datos.rutaHTML}${datos.tableroFase}${barra}
  <div role="tabpanel" id="panel-ruta-${elegida}" aria-labelledby="pestana-ruta-${elegida}" class="panel-pestana-ruta p-${elegida}">${cuerpos[elegida]()}</div>`;
}
