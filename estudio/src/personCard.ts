// La ficha de una persona en «Hoy»: quién es, su nivel, sus logros, su foco de la semana y su boletín. Salió de app.ts
// al partir los módulos grandes (propuesta aceptada pr_partir_modulos), como «Documentos» (vistaDocumentos.ts): recibe lo
// que pinta y no guarda nada. Su nombre de archivo va en inglés, como cada archivo que nace al partirlos (decisión del
// titular del 30 de octubre de 2026); lo de adentro pasa al inglés con el resto del código, después de la 0.1.0.
import { estadoMision, faseActual, nivelDe, notaFoco, repartoPorNivel, TITULAR, xpDe, type Contexto, type EstadoMision, type EtapaArranque, type Persona, type Proyecto } from '../../src/director/director';
import { logrosDe } from '../../src/director/animo';
import { fecha, pct } from './formato';
import { icono } from './iconos';
import { t } from './textos';
import { esc } from './util';

/** Lo que pinta la ficha. La página se lo da con sus datos. */
export interface DatosFicha {
  persona: Persona;
  /** El nombre de esa persona, como se le dice. */
  nombre: string;
  /** Si es quien mira: lleva «Tú». */
  esYo: boolean;
  /** El plan, el estado y las señales del proyecto. */
  ctx: Contexto;
  equipo: Proyecto['equipo'];
  arranque: EtapaArranque;
}

/** Los logros de una persona: los ganados, en dorado; los que faltan, apagados, con cómo se ganan. */
export function insignias(ctx: Contexto, p: Persona) {
  const logros = logrosDe(ctx, p);
  const ganados = logros.filter((l) => l.ganado).length;
  return `<div class="logros-p" aria-label="${esc(t('ficha.logrosAria', { ganados, total: logros.length }))}"><span class="etiqueta">${t('ficha.logros', { ganados, total: logros.length })}</span><ul>${logros
    .map((l) => `<li class="logro${l.ganado ? ' ganado' : ''}" title="${esc(`${l.nombre}: ${l.como}${l.ganado ? '' : t('ficha.porGanar')}`)}">${icono(l.ganado ? 'estrella' : 'candado')}<span>${esc(l.nombre)}</span></li>`)
    .join('')}</ul></div>`;
}

/** La ficha de una persona: quién es, su nivel, su foco de la semana, su boletín y el registro de sus misiones. */
export function fichaPersona(datos: DatosFicha) {
  const { persona: p, ctx } = datos;
  const { plan, estado, senales } = ctx;
  const integrante = datos.equipo.find((i) => i.id === p);
  const xp = xpDe(plan, estado, p);
  const n = nivelDe(xp);
  const mis = plan.misiones.filter((m) => m.para === p);
  const por = (es: EstadoMision[]) => mis.filter((m) => es.includes(estadoMision(m, plan, estado)));
  const hechas = por(['aprobada']);
  const commits = senales.esfuerzo?.commits.filter((c) => c.autor === p) ?? [];
  const foco = commits.length ? repartoPorNivel(faseActual(plan, estado), commits).foco : null;
  const boletin = [...plan.boletin].reverse().find((b) => b.para === p);
  const papel = integrante?.papel ?? integrante?.cargo ?? (p === TITULAR ? t('ficha.dirige') : '');
  return `<header class="cabeza-persona">
      <div class="monograma">${esc(datos.nombre.charAt(0))}</div>
      <div class="quien-p"><b>${esc(datos.nombre)}${datos.esYo ? ` <span class="chip foco">${t('equipo.tu')}</span>` : ''}</b><span>${esc(papel)}</span></div>
    </header>
    <div class="nivel-p"><div class="fila-nivel"><b>${t('ficha.nivel', { n: n.nivel })}</b><small>${t('ficha.aprobadas', { xp, n: hechas.length })}</small></div><div class="barra-xp"><div style="width:${n.enNivel}%"></div></div><small class="para-subir">${t('ficha.paraSubir', { faltan: n.paraSubir - n.enNivel, nivel: n.nivel + 1 })}</small></div>
    ${insignias(ctx, p)}
    ${datos.arranque === 'en_marcha' ? `<div class="notas-p">
      <span class="nota-letra ${foco === null ? '' : notaFoco(foco)}" title="${esc(t('ficha.focoTitulo'))}">${foco === null ? '—' : notaFoco(foco)}</span>
      <span>${foco === null ? t('ficha.focoSin') : t('ficha.foco', { pct: pct(foco), n: commits.length })}</span>
    </div>` : '' /* en el arranque todos los frentes esperan: el foco no dice nada todavía */}
    ${boletin ? `<p class="boletin-p"><b>${t('ficha.boletin', { fecha: fecha(boletin.fecha) })}</b> ${Object.entries(boletin.notas).map(([k, v]) => `${esc(k)} <b>${v}</b>`).join(' · ')}. ${esc(boletin.comentario)}</p>` : ''}`;
}
