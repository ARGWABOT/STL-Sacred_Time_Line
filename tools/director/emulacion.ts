// mirar.ts --emular: el teléfono de verdad. La ventana sin pantalla del navegador no baja de unos 492 px de ancho (con
// --window-size=390 la página medía 492 y la captura cortaba el resto), así que un teléfono de 390 o de 360 no se veía como
// lo ve la gente: el lienzo salía más ancho que la pantalla y todo parecía corrido. Con --emular, el navegador abre
// grande y el protocolo de depuración le pone el tamaño del teléfono antes de cargar la página (pantalla táctil y ancho de
// teléfono, como el visor del navegador).

export interface OrdenCdp { metodo: string; params: Record<string, unknown> }

/** Las órdenes que dejan al navegador con la pantalla de un teléfono de `ancho` × `alto` píxeles, antes de abrir la página. Pura. */
export function ordenesDeEmulacion(ancho: number, alto: number): OrdenCdp[] {
  return [
    { metodo: 'Emulation.setDeviceMetricsOverride', params: { width: ancho, height: alto, deviceScaleFactor: 1, mobile: true } },
    { metodo: 'Emulation.setTouchEmulationEnabled', params: { enabled: true, maxTouchPoints: 5 } },
  ];
}
