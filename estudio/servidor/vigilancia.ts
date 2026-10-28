// Lo que el vigilante de Vite no mira (vite.config.ts › server.watch.ignored). proyectos/ es donde vivía la memoria de los
// proyectos antes (git la ignora): vigilarla no sirve de nada y, en Windows, el vigilante la tiene abierta y no deja
// moverla («Permission denied» al sacar la copia vieja del Studio, nota del titular del 22 de octubre de 2026). Va atada
// a la raíz del Studio: un patrón suelto como «**/proyectos/**» también coincide con la raíz misma si alguien clona el
// Studio dentro de una carpeta llamada «proyectos», y Vite dejaría de vigilarlo entero (sin recargas ni reinicios).
import { relative, sep } from 'node:path';

/** ¿Es `ruta` la carpeta proyectos/ de la raíz del Studio, o algo dentro de ella? */
export function enProyectosViejos(raiz: string): (ruta: string) => boolean {
  return (ruta) => {
    const r = relative(raiz, ruta);
    return r === 'proyectos' || r.startsWith(`proyectos${sep}`) || r.startsWith('proyectos/');
  };
}
