// La vista del esfuerzo: los commits del repositorio del proyecto, repartidos por nivel de la fase en curso (en foco, de
// apoyo, en espera), por persona, por frente y día por día. Salió de app.ts al partir los módulos grandes (propuesta
// aceptada pr_partir_modulos): recibe lo que pinta y no guarda nada.
import { faseActual, notaFoco, repartoPorFrente, repartoPorNivel, trabajoDe, type EstadoDirector, type Nivel, type Plan, type Senales } from '../../src/director/director';
import { nombrePersona, personasEquipo } from './equipo';
import { chipNivel, fecha, pct } from './formato';
import { t } from './textos';
import { esc } from './util';

/** Lo que la vista lee del proyecto abierto. */
export interface DatosEsfuerzo { plan: Plan; estado: EstadoDirector; senales: Senales; repositorio: { info: unknown } }

export function vistaEsfuerzo(d: DatosEsfuerzo) {
  const e = d.senales.esfuerzo;
  if (!e) return `<p class="intro">${d.repositorio.info ? t('esfuerzo.sinHistorial') : t('esfuerzo.conectaRepo')}</p>`;
  const nombreFrente = (id: string) => d.plan.frentes.find((f) => f.id === id)?.nombre ?? id;
  const actual = faseActual(d.plan, d.estado);
  const nivel = repartoPorNivel(actual, e.commits);
  const frente = repartoPorFrente(e.commits);
  const filas = [...d.plan.frentes.map((x) => x.id), 'otros']
    .map((id) => ({ id, v: frente[id] ?? 0, n: id === 'otros' ? 'otros' : trabajoDe(actual, id).nivel }))
    .sort((a, b) => b.v - a.v);
  const max = Math.max(1, ...filas.map((f) => f.v));
  const dias = [...new Set(e.commits.map((c) => c.fecha))].sort().reverse();
  const segmento = (k: keyof typeof nivel, nombre: string) => (nivel[k] > 0 ? `<div class="${k}" style="width:${nivel[k]}%" title="${nombre}: ${pct(nivel[k])}">${nivel[k] >= 8 ? `${nombre} ${pct(nivel[k])}` : ''}</div>` : '');
  const porPersona = personasEquipo().map((p) => {
    const cs = e.commits.filter((c) => c.autor === p);
    const f = cs.length ? repartoPorNivel(actual, cs).foco : null;
    return `<li><b>${esc(nombrePersona(p))}:</b> ${t('esfuerzo.commitsDe', { n: cs.length })} · ${f === null ? t('esfuerzo.sinPropios') : t('esfuerzo.enFocoNota', { pct: pct(f), nota: notaFoco(f) })}</li>`;
  }).join('');
  return `<p class="intro">${t('esfuerzo.intro', { commits: e.commits.length, desde: fecha(e.desde), hasta: fecha(e.hasta), decisiones: e.decisiones })}</p>
    <h3>${t('esfuerzo.segunFase', { fase: esc(actual.nombre) })}</h3>
    <div class="reparto">${segmento('foco', t('nivel.foco'))}${segmento('apoyo', t('nivel.apoyo'))}${segmento('espera', t('nivel.espera'))}${segmento('otros', t('esfuerzo.otros'))}</div>
    <p class="leyenda-d"><span><i style="background:var(--barra-foco)"></i>${t('nivel.foco')} ${pct(nivel.foco)}</span><span><i style="background:var(--barra-apoyo)"></i>${t('nivel.apoyo')} ${pct(nivel.apoyo)}</span><span><i style="background:var(--barra-espera)"></i>${t('nivel.espera')} ${pct(nivel.espera)}</span><span><i style="background:var(--barra-otros)"></i>${t('esfuerzo.otros')} ${pct(nivel.otros)}</span><span>${t('esfuerzo.meta')}</span></p>
    <h3>${t('esfuerzo.porPersona')}</h3><ul class="resumen-d">${porPersona}</ul>
    <h3>${t('esfuerzo.porFrente')}</h3>
    <div class="barras">${filas
      .map((f) => `<div class="fila-barra"><span>${esc(f.id === 'otros' ? t('esfuerzo.otros') : nombreFrente(f.id))} ${f.id === 'otros' ? '' : chipNivel(f.n as Nivel)}</span><div class="pista-b"><div class="${f.n}" style="width:${((f.v / max) * 100).toFixed(1)}%"></div></div><span class="valor">${pct(f.v)}</span></div>`)
      .join('')}</div>
    <h3>${t('esfuerzo.diaPorDia')}</h3>
    <table class="dias"><thead><tr><th>${t('esfuerzo.colDia')}</th><th>${t('esfuerzo.colCommits')}</th><th>${t('nivel.foco')}</th><th>${t('nivel.espera')}</th></tr></thead><tbody>${dias
      .map((dia) => {
        const cs = e.commits.filter((c) => c.fecha === dia);
        const r = repartoPorNivel(actual, cs);
        return `<tr><td>${fecha(dia)}</td><td>${cs.length}</td><td>${pct(r.foco)}</td><td>${pct(r.espera)}</td></tr>`;
      })
      .join('')}</tbody></table>`;
}
