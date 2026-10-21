// Una sola recarga por revisión. Mientras el director trabaja, cada archivo del Studio que toca haría que Vite recargue
// la página (o reinicie el servidor, si toca el del Studio), y quien lee o explora mientras espera se vería interrumpido
// una y otra vez. Aquí se retienen: Vite sigue al día por dentro (sus módulos se invalidan como siempre), pero no le
// avisa a la página. Al terminar, si algo quedó retenido, una sola recarga: el Studio la anuncia con una cuenta de tres
// segundos y la cubre con su pantalla de carga. Sin modelo: solo se lee estudio.local.json.
import type { ViteDevServer } from 'vite';
import { directorTrabajando, leerLocalYa } from '../../src/director/proyectos';

/** El aviso a la página: «recarga cuando quieras» o, si el servidor se va a reiniciar, «viene un reinicio». */
export const EVENTO_RECARGA = 'estudio:recargar';
/** Lo que se da a la página para su cuenta antes de reiniciar el servidor (ella cuenta tres segundos). */
const ANTES_DE_REINICIAR_MS = 3500;

export function contenerRecargas(server: ViteDevServer, raiz: string, trabajandoAqui: () => boolean): void {
  const ocupado = () => trabajandoAqui() || directorTrabajando(leerLocalYa(raiz));
  const hot = server.environments.client.hot;
  const enviar = hot.send.bind(hot) as (...a: unknown[]) => void;
  let recarga = false;
  let reinicio = false;
  hot.send = ((...a: unknown[]) => {
    const p = a[0] as { type?: string } | undefined;
    if (p && typeof p === 'object' && (p.type === 'full-reload' || p.type === 'update') && ocupado()) {
      recarga = true;
      return;
    }
    enviar(...a);
  }) as typeof hot.send;
  // Cambiar el servidor del Studio reinicia Vite (y la página se recarga sola al reconectar): también espera al final
  const reiniciar = server.restart.bind(server);
  server.restart = async (forzar?: boolean) => {
    if (ocupado()) {
      reinicio = true;
      return;
    }
    await reiniciar(forzar);
  };
  const reloj = setInterval(() => {
    if ((!recarga && !reinicio) || ocupado()) return;
    const conReinicio = reinicio;
    recarga = reinicio = false;
    enviar({ type: 'custom', event: EVENTO_RECARGA, data: { reinicio: conReinicio } });
    if (conReinicio) setTimeout(() => void reiniciar().catch(() => {}), ANTES_DE_REINICIAR_MS).unref?.();
  }, 2000);
  reloj.unref?.();
  server.httpServer?.on('close', () => clearInterval(reloj));
}
