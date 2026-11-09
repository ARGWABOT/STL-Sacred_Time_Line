// La vista «Propuestas»: lo que el director propone en las fases a las que ya llegó la ruta, con el filtro entre lo que
// espera respuesta y todo. Salió de app.ts al partir los módulos grandes (propuesta aceptada pr_partir_modulos), como
// «La ruta» (vistaRuta.ts): recibe lo que pinta y no guarda nada; qué fase está abierta, qué propuesta ya se decidió, si se
// ven las decididas y las notas de cada una los da la página.
// Ahora es una lista a todo el ancho: cada propuesta es una línea (título y chips) que se despliega, y solo una abierta a la vez
// (el `name` común de los `details`), como en «Preguntas» (nota de voz del titular nmvvb1vpttit, 30 de octubre de 2026).
import type { EstadoDirector, Nota, Plan, RespuestaPropuesta } from '../../src/director/director';
import { fecha } from './formato';
import { icono } from './iconos';
import { conAyuda } from './palabras';
import { t } from './textos';
import { esc } from './util';

export const NOMBRE_RESPUESTA: Record<RespuestaPropuesta, string> = {
  get aceptada() { return t('propuesta.aceptada'); },
  get en_estudio() { return t('propuesta.enEstudio'); },
  get descartada() { return t('propuesta.descartada'); },
};

/** Lo que pinta la vista. La página se lo da con sus datos y con lo que depende de ella. */
export interface DatosPropuestas {
  plan: Plan;
  estado: EstadoDirector;
  /** ¿Ya llegó la ruta a esta fase? Lo de las fases futuras solo se cuenta. */
  faseAbierta: (id: string) => boolean;
  /** Una propuesta ya decidida antes de abrir el Studio: sale de la vista salvo que se pida verlas todas. */
  propuestaPasada: (id: string) => boolean;
  /** Si se pidió ver también las decididas («Todas»). */
  verPasadas: boolean;
  /** El nombre del titular, que decide, y si quien mira es él (solo él acepta o descarta). */
  nombreTitular: string;
  esTitular: boolean;
  /** Una nota sobre la propuesta, pintada por la página como en el resto del Studio. */
  tarjetaNota: (n: Nota, idPropuesta: string) => string;
  /** La propuesta que quien mira tiene abierta: un repintado (al aceptarla, al comentarla) no la vuelve a plegar. */
  abierta?: string;
}

export function vistaPropuestas(datos: DatosPropuestas) {
  const { plan, estado, faseAbierta, propuestaPasada, verPasadas } = datos;
  const futuras = plan.propuestas.filter((p) => !faseAbierta(p.fase)).length;
  const abiertas = plan.propuestas.filter((p) => faseAbierta(p.fase));
  const pasadas = abiertas.filter((p) => propuestaPasada(p.id)).length;
  const seVeP = (id: string) => verPasadas || !propuestaPasada(id);
  const porDecidir = abiertas.length - pasadas;
  // La barra de la sección: cuántas esperan y, si hay decididas, el filtro entre «Por decidir» y «Todas»
  const filtro = pasadas
    ? `<div class="filtro-propuestas" role="group" aria-label="${esc(t('propuestas.filtroAria'))}">
        <button type="button" data-ver-pasadas="0" aria-pressed="${!verPasadas}">${t('propuestas.porDecidir')} <span class="cifra">${porDecidir}</span></button>
        <button type="button" data-ver-pasadas="1" aria-pressed="${verPasadas}">${t('propuestas.todas')} <span class="cifra">${abiertas.length}</span></button>
      </div>`
    : '';
  const barra = abiertas.length
    ? `<div class="barra-propuestas"><p class="cuenta-propuestas">${porDecidir ? t('propuestas.espera', { n: porDecidir }) : t('propuestas.nadaEspera')}${pasadas ? t('propuestas.yaDecididas', { n: pasadas }) : ''}</p>${filtro}</div>`
    : '';
  // Sin nada que decidir a la vista: un estado vacío con su porqué, no una línea suelta
  const vacio = (titulo: string, texto: string, boton = '') => `<div class="vacio-propuestas">${icono('propuestas', 'icono icono-vacio')}<div><b>${titulo}</b><p>${texto}</p>${boton}</div></div>`;
  return `<p class="intro">${t('propuestas.intro', { titular: esc(datos.nombreTitular) })}${conAyuda('propuesta')}</p>
    ${barra}
    ${abiertas.length ? '' : vacio(t('propuestas.vacioTitulo'), t('propuestas.vacioTexto'))}
    ${abiertas.length && !porDecidir && !verPasadas ? vacio(t('propuestas.alDiaTitulo'), t('propuestas.alDiaTexto', { n: pasadas }), `<button type="button" class="boton-suave" data-ver-pasadas="1">${t('propuestas.verDecididas')}</button>`) : ''}
    ${plan.fases
      .map((f) => {
        // Lo que espera respuesta, arriba; lo ya decidido (si se pidió verlo), al final
        const ps = plan.propuestas.filter((p) => p.fase === f.id && seVeP(p.id)).sort((a, b) => Number(propuestaPasada(a.id)) - Number(propuestaPasada(b.id)));
        if (!ps.length || !faseAbierta(f.id)) return '';
        return `<h3 data-ancla="fase-${esc(f.id)}">${t('propuestas.paraDecidir', { fase: esc(f.nombre) })}</h3><div class="propuestas">${ps
          .map((p) => {
            const r = estado.propuestas[p.id];
            const notas = estado.notas.filter((n) => n.sobre.tipo === 'propuesta' && n.sobre.id === p.id);
            // Una línea que se despliega: el `name` común hace que abrir una cierre la que estaba abierta
            return `<details class="propuesta ${r?.estado ?? ''}" name="propuestas" data-ancla="propuesta-${esc(p.id)}"${datos.abierta === p.id ? ' open' : ''}>
              <summary><b>${esc(p.titulo)}</b><span class="chip">${esc(p.area)}</span>${r ? `<span class="chip ${r.estado === 'aceptada' ? 'foco' : r.estado === 'en_estudio' ? 'espera' : ''}">${NOMBRE_RESPUESTA[r.estado]}</span>` : `<span class="chip espera">${t('propuestas.porDecidir')}</span>`}</summary>
              <div class="cuerpo-propuesta">
              <dl><dt>${t('propuestas.problema')}</dt><dd>${esc(p.problema)}</dd><dt>${t('propuestas.laPropuesta')}</dt><dd>${esc(p.propuesta)}</dd><dt>${t('propuestas.conecta')}</dt><dd>${esc(p.conecta)}</dd></dl>
              ${r ? `<div class="firma">${t('propuestas.firma', { estado: NOMBRE_RESPUESTA[r.estado], quien: esc(r.quien), fecha: fecha(r.fecha) })}${r.nota ? `: ${esc(r.nota)}` : ''}</div>` : ''}
              ${notas.length ? `<ul class="notas-lista">${notas.map((n) => datos.tarjetaNota(n, p.id)).join('')}</ul>` : ''}
              <div class="respuesta">${datos.esTitular ? (['aceptada', 'descartada'] as RespuestaPropuesta[])
                .map((e) => `<button type="button" data-responder="${esc(p.id)}|${e}" class="${r?.estado === e ? 'sel' : ''}"${r?.estado === e ? ' disabled' : ''}>${e === 'aceptada' ? t('propuestas.aceptar') : t('propuestas.descartar')}</button>`)
                .join('') : ''}<button type="button" class="al-director" data-comentar="propuesta|${esc(p.id)}">${t('propuestas.comentar')}</button></div>
              </div>
            </details>`;
          })
          .join('')}</div>`;
      })
      .join('')}
    ${futuras ? `<p class="intro futuras">${t('propuestas.futuras', { n: futuras })}</p>` : ''}`;
}
