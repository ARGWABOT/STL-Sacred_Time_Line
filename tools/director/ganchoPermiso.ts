// El gancho PermissionRequest del director que lanza el Studio en el modo «Me pregunta en el Studio» (propuesta aceptada
// pr_permisos_al_momento, su pieza 3; pedido pd_permiso_espera). Claude Code lo corre cuando al director le falta un permiso
// y le pasa la llamada por la entrada estándar; el gancho se la pasa tal cual al servidor del Studio, que espera a la
// persona hasta dos minutos (estudio/servidor/permisosEnEspera.ts), e imprime lo que el servidor contestó. Sin lógica de
// permisos ni importaciones propias, para que lo corra node solo: lo decide el servidor. Si el Studio no responde o contesta
// algo que no es una respuesta de gancho, niega con su porqué: nunca da un permiso por su cuenta. La dirección, con la clave
// de la revisión, se la pone el lanzador en STL_PERMISO_URL. Lo usa el lanzador (estudio/servidor/revisor.ts › lanzar) solo
// en el modo «Me pregunta en el Studio» (estudio/servidor/modoPermisos.ts), que lo registra como gancho PermissionRequest.
import { pathToFileURL } from 'node:url';

/** Un poco más que la espera del Studio (dos minutos), para que niegue el Studio y no este reloj. */
export const TOPE_MS = 130_000;

export const SIN_STUDIO = 'El Studio no respondió a la pregunta de permiso. Sigue con lo demás sin hacerlo y dilo en tu respuesta.';

/** Negar con su porqué, en la forma que lee Claude Code. */
export function negar(mensaje: string) {
  return { hookSpecificOutput: { hookEventName: 'PermissionRequest', decision: { behavior: 'deny', message: mensaje } } };
}

/**
 * Lo que el gancho imprime con lo que contestó el servidor: nada si no hay qué decidir (204: no era un PermissionRequest,
 * y Claude Code sigue como siempre), la respuesta del servidor si es una de dar o negar, y negar en cualquier otro caso.
 */
export function queImprimir(estado: number, cuerpo: string): string {
  if (estado === 204) return '';
  if (estado === 200) {
    try {
      const r = JSON.parse(cuerpo);
      const d = r?.hookSpecificOutput?.decision;
      const bien = r?.hookSpecificOutput?.hookEventName === 'PermissionRequest' && (d?.behavior === 'allow' || (d?.behavior === 'deny' && typeof d.message === 'string'));
      if (bien) return JSON.stringify({ hookSpecificOutput: { hookEventName: 'PermissionRequest', decision: d.behavior === 'allow' ? { behavior: 'allow' } : { behavior: 'deny', message: d.message } } });
    } catch {
      // Lo que no se entiende se niega, abajo
    }
  }
  return JSON.stringify(negar(SIN_STUDIO));
}

async function leerEntrada(): Promise<string> {
  let texto = '';
  for await (const trozo of process.stdin) texto += trozo;
  return texto;
}

async function principal(): Promise<void> {
  const url = process.env.STL_PERMISO_URL;
  const entrada = await leerEntrada();
  if (!url) {
    process.stdout.write(JSON.stringify(negar(SIN_STUDIO)));
    return;
  }
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: entrada, signal: AbortSignal.timeout(TOPE_MS) });
    process.stdout.write(queImprimir(r.status, await r.text()));
  } catch {
    process.stdout.write(JSON.stringify(negar(SIN_STUDIO)));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) void principal();
