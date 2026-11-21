// El gancho PermissionRequest del director que lanza el Studio, en su único modo de permisos (documento «One permission
// mode»; antes pr_permisos_al_momento y pd_permiso_espera). Claude Code lo corre cuando al director le falta un permiso y
// le pasa la llamada por la entrada estándar; el gancho se la pasa tal cual al servidor del Studio, que espera a la persona
// sin límite de tiempo (estudio/servidor/permisosEnEspera.ts), e imprime lo que el servidor contestó. Sin lógica de
// permisos ni importaciones del repositorio, para que lo corra node solo: lo decide el servidor. Va por node:http y no por
// fetch, porque fetch se rinde a los cinco minutos sin cabeceras y la persona puede tardar más. Si el Studio no responde o
// contesta algo que no es una respuesta de gancho, niega con su porqué: nunca da un permiso por su cuenta. La dirección,
// con la clave de la revisión, se la pone el lanzador en STL_PERMISO_URL (estudio/servidor/revisor.ts › lanzar).
import { request } from 'node:http';
import { pathToFileURL } from 'node:url';

/** Un día, el tope técnico que tiene también Claude Code para el gancho (permisoAlMomento.ts › TOPE_GANCHO_MS): la persona no tiene límite. */
export const TOPE_MS = 24 * 60 * 60_000;

export const SIN_STUDIO = 'The Studio did not answer the permission question. Go on with the rest without it, and say in your answer what you could not do and which permission was missing.';

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

/** Le pasa la llamada al Studio y espera su respuesta, tarde lo que tarde la persona (hasta el tope). */
function preguntar(url: string, cuerpo: string): Promise<{ estado: number; texto: string }> {
  return new Promise((cumplir, fallar) => {
    const r = request(url, { method: 'POST', headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(cuerpo) } }, (res) => {
      let texto = '';
      res.setEncoding('utf8');
      res.on('data', (trozo) => (texto += trozo));
      res.on('end', () => cumplir({ estado: res.statusCode ?? 0, texto }));
      res.on('error', fallar);
    });
    r.setTimeout(TOPE_MS, () => r.destroy(new Error('tope')));
    r.on('error', fallar);
    r.end(cuerpo);
  });
}

async function principal(): Promise<void> {
  const url = process.env.STL_PERMISO_URL;
  const entrada = await leerEntrada();
  if (!url) {
    process.stdout.write(JSON.stringify(negar(SIN_STUDIO)));
    return;
  }
  try {
    const r = await preguntar(url, entrada);
    process.stdout.write(queImprimir(r.estado, r.texto));
  } catch {
    process.stdout.write(JSON.stringify(negar(SIN_STUDIO)));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) void principal();
