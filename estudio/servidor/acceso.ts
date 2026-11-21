/**
 * Lo del servidor para el atajo de un paso a la aplicación local del proyecto (pedido pd_acceso_directo): saber si la
 * aplicación responde en su dirección, para «Arranca <proyecto> primero» (nmwf5tf1stit). Los candados, puros, están en
 * src/director/atajo.ts; la ruta, en api.ts › «/atajo».
 */
import { esDireccionLocal } from '../../src/director/atajo.ts';

/**
 * Las cabeceras con que responde la aplicación en esa dirección de este computador, sin seguir redirecciones: para saber,
 * antes de cargarla en la pestaña de QA, si rehúsa el marco (qa.ts › rehusaElMarco). null si no responde o es de afuera.
 */
export async function cabecerasEnLocal(url: string, ms = 1_500): Promise<Headers | null> {
  if (!esDireccionLocal(url)) return null;
  return fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(ms) }).then(
    (r) => {
      void r.body?.cancel().catch(() => {});
      return r.headers;
    },
    () => null,
  );
}

/** ¿La aplicación responde en esa dirección de este computador? Cualquier respuesta cuenta; una dirección de afuera, nunca. */
export async function respondeEnLocal(url: string, ms = 1_500): Promise<boolean> {
  if (!esDireccionLocal(url)) return false;
  return fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(ms) }).then(
    (r) => {
      void r.body?.cancel().catch(() => {});
      return true;
    },
    () => false,
  );
}
