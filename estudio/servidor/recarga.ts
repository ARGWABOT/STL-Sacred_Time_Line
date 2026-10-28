// Una sola recarga por revisión. Mientras el director trabaja, cada archivo del Studio que toca haría que Vite recargue
// la página (o reinicie el servidor, si toca el del Studio), y quien lee o explora mientras espera se vería interrumpido
// una y otra vez. Aquí se retienen: Vite sigue al día por dentro (sus módulos se invalidan como siempre), pero no le
// avisa a la página. Al terminar, si algo quedó retenido, una sola recarga: el Studio la anuncia con una cuenta de tres
// segundos y la cubre con su pantalla de carga. Sin modelo: solo se lee estudio.local.json.
import type { ViteDevServer } from 'vite';
import { directorTrabajando, leerLocalYa } from '../../src/director/proyectos.ts';

/** El aviso a la página: «recarga cuando quieras» o, si el servidor se va a reiniciar, «viene un reinicio». */
export const EVENTO_RECARGA = 'estudio:recargar';
/** Lo que se da a la página para su cuenta antes de reiniciar el servidor (ella cuenta tres segundos). */
const ANTES_DE_REINICIAR_MS = 3500;
/** La página avisa que quedó libre (nadie escribe ni graba) y empieza su cuenta: entonces se reinicia. */
const EVENTO_LIBRE = 'estudio:libre-para-reiniciar';
/** Si ninguna página responde en este tiempo, el servidor se reinicia igual (no se queda con el código viejo). */
const TOPE_ESPERA_PAGINA_MS = 30 * 60_000;

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
  // El reinicio se lleva la página, y con ella lo que alguien esté escribiendo o grabando: espera a que la página diga
  // que quedó libre (empieza su cuenta). Sin ninguna página abierta, o si ninguna responde en un buen rato, va igual
  let esperandoPagina = 0;
  const reiniciarYa = () => {
    esperandoPagina = 0;
    setTimeout(() => void reiniciar().catch(() => {}), ANTES_DE_REINICIAR_MS).unref?.();
  };
  hot.on(EVENTO_LIBRE, () => { if (esperandoPagina) reiniciarYa(); });
  // Una página que se abrió (o se recargó) mientras tanto no recibió el aviso: se le repite
  hot.on('vite:client:connect', () => { if (esperandoPagina) enviar({ type: 'custom', event: EVENTO_RECARGA, data: { reinicio: true } }); });
  const reloj = setInterval(() => {
    if (esperandoPagina) {
      if (!server.ws.clients.size || Date.now() - esperandoPagina > TOPE_ESPERA_PAGINA_MS) reiniciarYa();
      return;
    }
    if ((!recarga && !reinicio) || ocupado()) return;
    const conReinicio = reinicio;
    recarga = reinicio = false;
    enviar({ type: 'custom', event: EVENTO_RECARGA, data: { reinicio: conReinicio } });
    if (conReinicio) esperandoPagina = Date.now();
  }, 2000);
  reloj.unref?.();
  server.httpServer?.on('close', () => clearInterval(reloj));
}
