// La línea del último respaldo, al pie de la barra izquierda (pedido pd_sin_modo_equipo): en lugar de la sincronización
// y de «quién usa el Studio», que se fueron con el modo equipo (nmwds7lxytit), dice cuándo subió el último respaldo de la
// memoria a GitHub (nmwdur1ejtit); «Sin respaldo», en un color de aviso suave, sin repositorio de GitHub o sin el permiso
// de subir, y un clic lleva a conectarlo (nmwdxv033tit); «El respaldo falló», en ese mismo color, y un clic dice el motivo y
// cómo arreglarlo (nmwemu30ktit); y un clic en la línea normal abre una ventanita con cuándo, a dónde y «Respaldar ahora»
// (nmwf5n02utit). Pura: app.ts la pinta y abre lo que dice.
import type { Destino } from '../../src/director/director';
import type { EstadoRespaldo } from '../servidor/respaldo';
import { t } from './textos';

export interface LineaRespaldo {
  texto: string;
  /** La clase de la insignia: `al_dia` (verde), `subiendo` o `atencion` (el color de aviso suave). Nunca `aviso`:
   *  esa es la caja de aviso de toda la página (`.aviso`, con 12 px de margen arriba), y el respaldo la heredaba, bajaba
   *  12 px y dejaba el pie más alto que el selector de idioma (nmwjm1bb0tit, el tercer intento fallido). */
  clase: 'al_dia' | 'subiendo' | 'atencion';
  titulo: string;
}

/** Hace cuánto, en palabras cortas. */
export function haceCuanto(cuando: string, ahora = Date.now()): string {
  const s = Math.max(0, Math.round((ahora - new Date(cuando).getTime()) / 1000));
  if (s < 60) return t('respaldo.haceSegundos', { n: s });
  if (s < 3600) return t('respaldo.haceMinutos', { n: Math.round(s / 60) });
  if (s < 86_400) return t('respaldo.haceHoras', { n: Math.round(s / 3600) });
  return t('respaldo.haceDias', { n: Math.round(s / 86_400) });
}

/** Por qué no hay respaldo, en una frase. */
export const motivoSinRespaldo = (r: Pick<EstadoRespaldo, 'motivo'>) => t(`respaldo.motivo.${r.motivo ?? 'sin_repositorio'}`);
/** Por qué falló el último, con cómo arreglarlo, en una frase. */
export const causaDelFallo = (r: Pick<EstadoRespaldo, 'causa'>) => t(`respaldo.causa.${r.causa ?? 'otro'}`);

/** La línea del pie, para un estado del respaldo. Sin estado (sin proyecto), nada. */
export function lineaDeRespaldo(r: EstadoRespaldo | null | undefined, ahora = Date.now()): LineaRespaldo | null {
  if (!r) return null;
  if (r.fase === 'subiendo') return { texto: t('respaldo.subiendo'), clase: 'subiendo', titulo: t('respaldo.subiendoTitulo') };
  // La memoria del Studio sin su dirección privada lo dice con su nombre, no con el «Sin respaldo» de siempre: el 14 de
  // noviembre se perdió y nadie lo vio en una semana (pd_respaldo_direccion)
  if (r.fase === 'sin_respaldo') return { texto: t(r.motivo === 'del_studio' ? 'respaldo.sinDireccion' : 'respaldo.sin'), clase: 'atencion', titulo: motivoSinRespaldo(r) };
  if (r.fase === 'fallo') return { texto: t('respaldo.fallo'), clase: 'atencion', titulo: causaDelFallo(r) };
  if (r.fase === 'nunca' || !r.cuando) return { texto: t('respaldo.aunNo'), clase: 'al_dia', titulo: t('respaldo.aunNoTitulo') };
  return { texto: t('respaldo.ultimo', { cuando: haceCuanto(r.cuando, ahora) }), clase: 'al_dia', titulo: t('respaldo.ultimoTitulo') };
}

/**
 * Qué hace un clic en la línea: llevar a donde se conecta (sin repositorio de GitHub, a «Proyecto» › «Dónde está»; sin el
 * permiso, a «Permisos»), o abrir la ventanita con lo que pasó y, si se puede, «Respaldar ahora».
 */
export type ClicRespaldo =
  | { que: 'ir'; destino: Destino }
  | { que: 'ventana'; titulo: string; texto: string; respaldar: boolean };

export function clicDeRespaldo(r: EstadoRespaldo, ahora = Date.now()): ClicRespaldo {
  if (r.fase === 'sin_respaldo' && (r.motivo === 'sin_repositorio' || r.motivo === 'no_github' || r.motivo === 'del_studio' || r.motivo === 'otra_cuenta')) return { que: 'ir', destino: { vista: 'proyecto', ancla: 'p-repositorio', etiqueta: t('proyecto.dondeEsta') } };
  if (r.fase === 'sin_respaldo' && r.motivo === 'sin_permiso') return { que: 'ir', destino: { vista: 'modelo', ancla: 'm-permisos', etiqueta: t('modelo.pestanaPermisos') } };
  const donde = r.destino ? t('respaldo.donde', { repo: r.destino, rama: r.rama }) : '';
  if (r.fase === 'sin_respaldo') return { que: 'ventana', titulo: t('respaldo.sin'), texto: motivoSinRespaldo(r), respaldar: false };
  if (r.fase === 'fallo') return { que: 'ventana', titulo: t('respaldo.fallo'), texto: [causaDelFallo(r), r.cuando ? t('respaldo.elUltimoBueno', { cuando: haceCuanto(r.cuando, ahora) }) : ''].filter(Boolean).join('\n'), respaldar: true };
  const cuando = r.cuando ? t('respaldo.subioHace', { cuando: haceCuanto(r.cuando, ahora) }) : t('respaldo.aunNoTitulo');
  return { que: 'ventana', titulo: t('respaldo.ventanaTitulo'), texto: [cuando, donde, t('respaldo.ventanaCuando')].filter(Boolean).join('\n'), respaldar: r.fase !== 'subiendo' };
}
