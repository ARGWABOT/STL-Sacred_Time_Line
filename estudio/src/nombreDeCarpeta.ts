// El nombre de un proyecto, sacado de su carpeta (pd_campo_libre, decisión del titular nmwfltw1dtit, 13 de noviembre de
// 2026): legible y sin modelo, «talleres-app» es «Talleres app». Lo usan el formulario de la entrega y el servidor, cuando
// la entrega llega sin nombre. Se cambia después en «Proyecto» › «Qué es». Puro.

/** El último tramo de una ruta, sin la barra del final. */
const nombreDeRuta = (ruta: string) => ruta.trim().replace(/[\\/]+$/, '').split(/[\\/]/).pop() ?? '';

/** El nombre legible de la carpeta: guiones, guiones bajos y puntos como espacios, y la primera letra en mayúscula. */
export function nombreLegible(ruta: string): string {
  const s = nombreDeRuta(ruta).replace(/[-_.]+/g, ' ').replace(/\s+/g, ' ').trim();
  return s ? s[0].toLocaleUpperCase() + s.slice(1) : '';
}
