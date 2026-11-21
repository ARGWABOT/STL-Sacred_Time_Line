// «Salud del Studio», en «Modelo y consumo» › «Lo que gasta», y el aviso fino de arriba de cada sección. El servidor se
// revisa solo de vez en cuando y arregla lo que puede sin riesgo (GET /__estudio/director/salud); aquí solo se pinta lo
// que dice: no guarda nada. Lo que no pudo arreglar sale arriba de todas las secciones hasta que se resuelve; lo que
// arregló solo, en una línea por arreglo de los últimos 7 días (decisiones nmw9of90atit y nmw9p8305tit).
import { fecha, hora } from './formato';
import { t, type ClaveDeTexto } from './textos';
import { esc } from './util';

export type ChequeoSalud = 'plan' | 'marcas' | 'revision' | 'candado' | 'rama' | 'claude' | 'disco';

/** Lo que da el servidor en GET /__estudio/director/salud. */
export interface EstadoSalud {
  /** Cuándo fue la última revisión (null: aún no corrió). */
  cuando: string | null;
  chequeos: { id: ChequeoSalud; estado: 'bien' | 'arreglado' | 'problema' }[];
  /** Lo que no pudo arreglar y sigue ahí. `dato`: el detalle tal cual; `orden`: el comando que lo arregla (claude). */
  problemas: { id: ChequeoSalud; dato?: string; orden?: string }[];
  /** Lo que arregló solo en los últimos 7 días, lo más nuevo primero. */
  arreglos: { cuando: string; tipo: 'revision' | 'candado' | 'marcas'; dato?: string }[];
  /** «Diagnosticar y reparar» (servidor/reparar.ts › EstadoReparacion; pd_salud_c). */
  reparacion?: EstadoReparacion;
  /** Las fallas de 90 días, una línea por causa (servidor/ultimaCaida.ts › resumenDeFallas; pd_salud_d). */
  fallas?: { causa: CausaFalla; n: number; ultima: { cuando: string; mensaje: string; traza: string; tipo: 'carga' | 'servidor' | 'revision' } }[];
  /** La causa de dos fallas seguidas: el aviso de arriba ofrece «Diagnosticar y reparar» (nmw9rdkr3tit). */
  dosSeguidas?: CausaFalla | null;
}

export type CausaFalla = 'modelo' | 'codigo' | 'computador' | 'cuenta' | 'desconocida';

export interface EstadoReparacion {
  estado: 'ninguna' | 'espera' | 'trabaja' | 'comprueba' | 'guardada' | 'deshecha' | 'sin_cambios' | 'no_termino';
  minutos?: number;
  ultimo?: string;
  informe?: string;
  cuando?: string;
  uso?: number | null;
}

/** Mientras la reparación está pedida o trabaja: el botón no pide otra, y la vista se refresca seguido. Pura. */
export const reparando = (r: EstadoReparacion | undefined | null) => !!r && (r.estado === 'espera' || r.estado === 'trabaja' || r.estado === 'comprueba');

/** Desde este uso (%) del límite de cinco horas, la línea bajo el botón (servidor/reparar.ts › USO_AVISO_REPARAR). */
const USO_AVISO = 90;

/** La línea de lo que hace la reparación, en el idioma de la interfaz; vacía si nunca hubo. Pura. */
export function lineaDeReparacion(r: EstadoReparacion | undefined | null): string {
  if (!r || r.estado === 'ninguna') return '';
  if (r.estado === 'trabaja') return t('salud.reparar.estado.trabaja', { min: String(r.minutos ?? 0), ultimo: r.ultimo ? t('salud.reparar.ultimo', { ultimo: r.ultimo }) : '' });
  return t(clave(`salud.reparar.estado.${r.estado}`));
}

/**
 * El atributo de un plegable que recuerda si lo abriste (app.ts › plegable): sin él, cada repintado de la página cerraba
 * el informe y las trazas que estabas leyendo (auditoría de la entrega, punto 6). Sin página, no recuerda nada.
 */
export type Plegable = (clave: string) => string;
const sinRecordar: Plegable = () => '';

/** El botón «Diagnosticar y reparar», con su línea de lo que hace y, cerca del límite de cinco horas, la de aviso. Pura. */
function pintarReparar(r: EstadoReparacion | undefined | null, plegable: Plegable = sinRecordar): string {
  const linea = lineaDeReparacion(r);
  const limite = typeof r?.uso === 'number' && r.uso >= USO_AVISO ? `<p class="como" data-reparar-limite>${esc(t('salud.reparar.limite', { uso: String(r.uso) }))}</p>` : '';
  const informe = r?.informe && !reparando(r) ? `<details${plegable('salud|informe')}><summary>${t('salud.reparar.informe')}</summary><pre class="salud-traza">${esc(r.informe)}</pre></details>` : '';
  return `<h4>${t('salud.reparar.titulo')}</h4>
      <p class="como">${t('salud.reparar.explica')}</p>
      <p><button type="button" class="boton" data-reparar${reparando(r) ? ' disabled' : ''}>${t('salud.reparar.boton')}</button></p>
      ${limite}
      ${linea ? `<p class="como" data-reparar-estado role="status">${esc(linea)}${r?.cuando && !reparando(r) ? ` · ${esc(cuando(r.cuando))}` : ''}</p>` : ''}
      ${informe}`;
}

/** Una línea por causa, con su cuenta de 90 días; la última se abre con su traza (nmw9ofvc7tit). Pura. */
export function pintarFallas(f: EstadoSalud['fallas'], plegable: Plegable = sinRecordar): string {
  if (!f) return '';
  if (!f.length) return `<h4>${t('salud.fallasTitulo')}</h4><p class="como">${t('salud.sinFallas')}</p>`;
  return `<h4>${t('salud.fallasTitulo')}</h4><ul class="consumo-lista">${f.map((x) => `<li data-causa="${x.causa}"><span>${t(clave(`salud.causa.${x.causa}`))}</span><span>${t('salud.fallas.linea', { n: String(x.n), cuando: esc(cuando(x.ultima.cuando)) })}</span>
        <details${plegable(`salud|traza|${x.causa}`)}><summary>${t('salud.fallas.traza')}</summary><p>${t(clave(`salud.tipo.${x.ultima.tipo}`))}: ${esc(x.ultima.mensaje)}</p>${x.ultima.traza ? `<pre class="salud-traza">${esc(x.ultima.traza)}</pre>` : ''}</details></li>`).join('')}</ul>`;
}

/** Dónde vive la sección: «Modelo y consumo» › «Lo que gasta» (pestanasModelo.ts; su prueba busca el ancla escrita tal cual). */
export const ANCLA_SALUD = 'm-salud';

const cuando = (iso: string) => `${fecha(iso)} ${hora(iso)}`;
const clave = (c: string) => c as ClaveDeTexto;

/** El detalle de un problema, en palabras: el de claude y el del disco se explican; el resto va tal cual lo dio el servidor. */
function detalle(p: EstadoSalud['problemas'][number]): string {
  if (!p.dato) return '';
  if (p.id === 'claude') return p.dato === 'programa' ? t('salud.claudePrograma') : p.dato === 'sesion' ? t('salud.claudeSesion') : p.dato;
  if (p.id === 'disco') return t('salud.datoDisco', { dato: p.dato });
  return p.dato;
}

/** La sección «Salud del Studio». Sin respuesta del servidor (null), nada: no se muestra lo que no se sabe. Pura. */
export function pintarSalud(e: EstadoSalud | null, plegable: Plegable = sinRecordar): string {
  if (!e) return '';
  const lineas = e.chequeos.map((c) => `<li class="salud-${c.estado}"><span>${t(clave(`salud.chequeo.${c.id}`))}</span> · <b>${t(clave(`salud.estado.${c.estado}`))}</b></li>`).join('');
  const problemas = e.problemas.length
    ? `<h4>${t('salud.problemasTitulo')}</h4><ul class="consumo-lista">${e.problemas.map((p) => {
      const d = detalle(p);
      return `<li data-problema="${esc(p.id)}"><span>${t(clave(`salud.chequeo.${p.id}`))}</span>${d ? `<small>${esc(d)}</small>` : ''}${p.orden ? `<small>${t('salud.orden')} <code>${esc(p.orden)}</code></small>` : ''}</li>`;
    }).join('')}</ul>`
    : '';
  const arreglos = e.arreglos.length
    ? `<ul class="consumo-lista">${e.arreglos.map((a) => `<li data-arreglo="${a.tipo}"><span>${esc(cuando(a.cuando))}</span><span>${t(clave(`salud.arreglo.${a.tipo}`), { dato: a.dato ? t('salud.arregloDe', { dato: esc(a.dato) }) : '' })}</span></li>`).join('')}</ul>`
    : `<p class="como">${t('salud.sinArreglos')}</p>`;
  return `<section class="panel-d" data-ancla="m-salud">
      <h3>${t('salud.titulo')}</h3>
      <p class="como">${t('salud.intro')} ${e.cuando ? t('salud.cuando', { cuando: esc(cuando(e.cuando)) }) : t('salud.sinRevisar')}</p>
      ${lineas ? `<ul class="consumo-lista">${lineas}</ul>` : ''}
      ${problemas}
      ${pintarReparar(e.reparacion, plegable)}
      ${pintarFallas(e.fallas, plegable)}
      <h4>${t('salud.arreglosTitulo')}</h4>
      ${arreglos}
    </section>`;
}

/**
 * El aviso fino de arriba de cada sección: solo con lo que no pudo arreglar (lo arreglado no avisa), con un enlace que
 * lleva a «Salud del Studio». Vacío si no hay problemas o no se sabe. Pura.
 */
export function avisoDeSalud(e: EstadoSalud | null): string {
  if (!e) return '';
  // Dos fallas seguidas con la misma causa: el aviso ofrece «Diagnosticar y reparar», hasta que se oprime o llega otra causa
  const dos = e.dosSeguidas && !reparando(e.reparacion)
    ? `<p class="aviso remoto aviso-salud" role="status" data-dos-fallas>${t('salud.dosFallas', { causa: esc(t(clave(`salud.causa.${e.dosSeguidas}`))) })} <button type="button" class="enlace" data-reparar>${t('salud.reparar.boton')}</button></p>`
    : '';
  if (!e.problemas.length) return dos;
  const que = [...new Set(e.problemas.map((p) => p.id))].map((id) => t(clave(`salud.corto.${id}`))).join(', ');
  return `<p class="aviso remoto aviso-salud" role="status">${t('salud.aviso', { que: esc(que) })} <button type="button" class="enlace" data-ver-salud>${t('salud.avisoVer')}</button></p>${dos}`;
}
