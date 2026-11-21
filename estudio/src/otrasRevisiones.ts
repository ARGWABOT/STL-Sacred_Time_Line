// Las revisiones de los otros proyectos, vistas desde el activo (pedido pd_revisiones_simultaneas): un director por
// proyecto y varios a la vez. Cómo se ve, decidido el 12 de noviembre de 2026: una línea en la cabecera mientras corre otra
// (nmwdqp011tit), que también dice que dos a la vez gastan el plan más rápido y nunca impide pedir la tuya (nmwdqpdzstit);
// un punto junto a su nombre en la lista de proyectos (nmwdqqao4tit); un aviso con «Ir a <proyecto>» cuando cierra
// (nmwdqqrlitit); la actualización del Studio que espera a esa revisión, dicha solo en esa línea (nmwdqrcj6tit); y para
// seguirla, se cambia a su proyecto (nmwdquisatit). Puro: la página lo pinta.
import type { OtraRevision } from '../../src/director/proyectos';

type Tx = (clave: 'simult.otraCorre' | 'simult.actualizacion' | 'simult.puntoCorre' | 'simult.puntoPedida', datos?: Record<string, string | number>) => string;

/** Las que siguen abiertas (pedidas o en marcha), sin las ya cerradas. */
const abiertas = (otras: OtraRevision[] | undefined) => (otras ?? []).filter((o) => o.estado !== 'hecha');

/**
 * La línea de la cabecera: con una actualización del Studio retenida, que se aplica cuando terminen las otras; si no, que
 * corre otra revisión y dos a la vez gastan el plan más rápido. Vacía si ninguna otra está abierta.
 */
export function lineaDeOtras(otras: OtraRevision[] | undefined, recargaRetenida: boolean, tx: Tx): string {
  const a = abiertas(otras);
  if (!a.length) return '';
  const nombres = a.map((o) => o.nombre).join(', ');
  return recargaRetenida ? tx('simult.actualizacion', { nombres }) : tx('simult.otraCorre', { nombres });
}

/** El punto de un proyecto en la lista: su revisión pedida o en marcha, con lo que lleva. null si no tiene ninguna abierta. */
export function puntoDe(otras: OtraRevision[] | undefined, proyecto: string, tx: Tx, ahora = Date.now()): { enMarcha: boolean; titulo: string } | null {
  const o = abiertas(otras).find((x) => x.proyecto === proyecto);
  if (!o) return null;
  if (o.estado === 'pedida') return { enMarcha: false, titulo: tx('simult.puntoPedida') };
  return { enMarcha: true, titulo: tx('simult.puntoCorre', { min: Math.max(0, Math.floor((ahora - Date.parse(o.desde)) / 60_000)) }) };
}

/**
 * Las que cerraron desde la consulta anterior: estaban abiertas y ahora están hechas. Lo que ya estaba hecho al llegar (o
 * al cambiar de proyecto, sin anterior) no se avisa: el aviso es una sola vez, al cerrar.
 */
export function cerradasDesde(antes: OtraRevision[] | undefined, ahora: OtraRevision[] | undefined): OtraRevision[] {
  if (!antes) return [];
  const abiertasAntes = new Set(abiertas(antes).map((o) => o.proyecto));
  return (ahora ?? []).filter((o) => o.estado === 'hecha' && abiertasAntes.has(o.proyecto));
}
