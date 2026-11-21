// Las propuestas del director: su nombre de cada respuesta y los botones que la dan. La sección «Propuestas» salió del
// Studio con el plan en una sola línea (pedido pd_una_sola_linea, segunda rebanada): cada propuesta que espera tu respuesta
// es un punto gris de la línea de «Hoy», y su tarjeta, debajo de la línea, lleva estos botones (app.ts › tarjetaDelPunto).
import type { RespuestaPropuesta } from '../../src/director/director';
import { atributosDelCargador, claveResponder, contenidoDelBoton, corre, lineaDelCargador, type EstadoCargador } from './cargador';
import { t } from './textos';
import { esc } from './util';

export const NOMBRE_RESPUESTA: Record<RespuestaPropuesta, string> = {
  get aceptada() { return t('propuesta.aceptada'); },
  get en_estudio() { return t('propuesta.enEstudio'); },
  get descartada() { return t('propuesta.descartada'); },
};

/**
 * «Aceptar» y «Descartar» de una propuesta, con su cargador (pd_cargadores, nmwjofnwgtit): el oprimido gira; el otro, apagado
 * mientras guarda; el de lo ya respondido, apagado y marcado. Solo el titular los ve: la página decide si van.
 */
export function botonesResponder(id: string, respondida: RespuestaPropuesta | undefined, cargador?: (clave: string) => EstadoCargador | null): string {
  return (['aceptada', 'descartada'] as RespuestaPropuesta[])
    .map((e) => {
      const carg = cargador?.(claveResponder(id, e)) ?? null;
      const vecino = (['aceptada', 'descartada'] as const).some((x) => x !== e && corre(cargador?.(claveResponder(id, x))));
      const apagado = respondida === e || (vecino && !corre(carg));
      return `<button type="button" data-responder="${esc(id)}|${e}" class="${respondida === e ? 'sel' : ''}"${apagado ? ' disabled' : ''}${atributosDelCargador(carg)}>${contenidoDelBoton(e === 'aceptada' ? t('propuestas.aceptar') : t('propuestas.descartar'), carg)}</button>${lineaDelCargador(claveResponder(id, e), carg)}`;
    })
    .join('');
}
