// «Historia» con lo terminado primero, por mes (pd_una_sola_linea, decisión nmwmyzj4etit: «Lo terminado queda atrás,
// plegado»; la pestaña se llama «Historia» desde nmwnz4curtit). Lo que el titular ya cerró —misiones aprobadas, pedidos
// hechos, propuestas ejecutadas— va arriba, agrupado por mes, el más nuevo abierto; la hoja de ruta, plegada debajo. Pura.
import type { EstadoDirector, Plan } from '../../src/director/director';
import { momento } from './formato';
import { idiomaActual, t } from './textos';
import { esc } from './util';

/** Una cosa terminada, con cuándo: su mes sale de ahí. */
export interface Terminado {
  tipo: 'mision' | 'pedido' | 'propuesta';
  id: string;
  titulo: string;
  cuando: string;
}

/** El primer pedazo de un texto largo (un pedido trae su historia entera): hasta su primer punto, o 140 letras. Pura. */
export function resumenCorto(texto: string, max = 140): string {
  const punto = texto.search(/[.:](\s|$)/);
  const corto = punto > 0 && punto < max ? texto.slice(0, punto) : texto;
  return corto.length > max ? `${corto.slice(0, max - 1).trimEnd()}…` : corto;
}

/** Lo terminado del plan, lo más nuevo primero: misiones aprobadas, pedidos hechos y propuestas ejecutadas. Pura. */
export function terminados(plan: Plan, _estado?: EstadoDirector): Terminado[] {
  const lista: Terminado[] = [];
  for (const m of plan.misiones) {
    const r = plan.revisiones[m.id];
    if (r?.veredicto === 'aprobada' && r.cuando) lista.push({ tipo: 'mision', id: m.id, titulo: m.titulo, cuando: r.cuando });
  }
  for (const p of plan.pedidos ?? []) if (p.hecho?.cuando) lista.push({ tipo: 'pedido', id: p.id, titulo: resumenCorto(p.texto), cuando: p.hecho.cuando });
  for (const p of plan.propuestas) {
    const e = plan.ejecutadas?.[p.id];
    if (e?.cuando) lista.push({ tipo: 'propuesta', id: p.id, titulo: p.titulo, cuando: e.cuando });
  }
  return lista.sort((a, b) => b.cuando.localeCompare(a.cuando));
}

/** Lo terminado, por mes («2026-11»), los meses de lo más nuevo a lo más viejo. Pura. */
export function porMes(lista: readonly Terminado[]): { mes: string; cosas: Terminado[] }[] {
  const meses = new Map<string, Terminado[]>();
  for (const x of lista) {
    const mes = x.cuando.slice(0, 7);
    meses.set(mes, [...(meses.get(mes) ?? []), x]);
  }
  return [...meses.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([mes, cosas]) => ({ mes, cosas }));
}

/** El nombre del mes en el idioma de la interfaz («November 2026», «noviembre de 2026»). */
export function nombreDelMes(mes: string): string {
  const [a, m] = mes.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, 15)).toLocaleDateString(idiomaActual() === 'en' ? 'en-US' : 'es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/**
 * La historia por mes y, debajo, plegada, la hoja de ruta (`hoja`, lo que pintaba «La ruta»). El mes más nuevo nace abierto.
 * Un botón viejo a un ancla de la hoja (`pedido-<id>`, `r-plan`…) la despliega solo: la página abre los plegables que la
 * contienen. `plegable(clave)` dice si un plegable nace abierto (lo recuerda la página).
 */
export function historiaPorMes(plan: Plan, hoja: string, plegable: (clave: string) => string): string {
  const meses = porMes(terminados(plan));
  const tipo = (x: Terminado) => t(`historia.tipo.${x.tipo}`);
  const lista = meses.length
    ? meses.map(({ mes, cosas }, i) => `<details class="historia-mes" data-mes="${esc(mes)}"${i === 0 ? ' open' : plegable(`historia|${mes}`)}><summary>${esc(nombreDelMes(mes))} <span class="cifra">${cosas.length}</span></summary><ul class="adelantado">${cosas.map((x) => `<li><span class="chip">${esc(tipo(x))}</span> ${esc(x.titulo)} <span class="como cuando-hecha">${momento(x.cuando)}</span></li>`).join('')}</ul></details>`).join('')
    : `<p class="como">${t('historia.nadaAun')}</p>`;
  return `<div class="panel-d historia" data-ancla="r-historia"><h3>${t('historia.titulo')}</h3><p class="como">${t('historia.texto')}</p>${lista}</div>
  <details class="hoja-de-ruta" data-ancla="r-hoja"${plegable('hoja-de-ruta')}><summary>${t('historia.hoja')}</summary>${hoja}</details>`;
}
