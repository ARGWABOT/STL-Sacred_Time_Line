// Una sola recarga por revisión. Mientras el director trabaja, cada archivo del Studio que toca haría que Vite recargue
// la página (o reinicie el servidor, si toca el del Studio), y quien lee o explora mientras espera se vería interrumpido
// una y otra vez. Aquí se retienen: Vite sigue al día por dentro (sus módulos se invalidan como siempre), pero no le
// avisa a la página. Al terminar, si algo quedó retenido, una sola recarga: el Studio la anuncia con una cuenta de tres
// segundos y la cubre con su pantalla de carga. Sin modelo: solo se lee estudio.local.json.
import type { ViteDevServer } from 'vite';
import { directorTrabajando, esElStudio, leerLocalYa, revisionAbierta } from '../../src/director/proyectos.ts';

/** El aviso a la página: «recarga cuando quieras» o, si el servidor se va a reiniciar, «viene un reinicio». */
export const EVENTO_RECARGA = 'estudio:recargar';
/** Lo que se da a la página para su cuenta antes de reiniciar el servidor (ella cuenta tres segundos). */
const ANTES_DE_REINICIAR_MS = 3500;
/** La página avisa que quedó libre (nadie escribe ni graba) y empieza su cuenta: entonces se reinicia. */
const EVENTO_LIBRE = 'estudio:libre-para-reiniciar';
/** Si ninguna página responde en este tiempo, el servidor se reinicia igual (no se queda con el código viejo). */
const TOPE_ESPERA_PAGINA_MS = 30 * 60_000;

/**
 * Lo que la página pregunta al ver cerrada una revisión: si el servidor retiene una recarga o un reinicio (el director
 * cambió algún archivo del Studio). Sin nada retenido, la página se pone al día en su sitio, sin recargarse (nota
 * nmwbk689ttit: el diagnóstico de otro proyecto recargaba el Studio entero y se llevaba la elección de la meta).
 */
export interface Contencion { retenida(): boolean }

/** Lo mínimo del servidor de Vite que se usa aquí (las pruebas lo imitan). */
type ServidorVite = Pick<ViteDevServer, 'restart' | 'ws' | 'httpServer'> & { environments: { client: { hot: Pick<ViteDevServer['environments']['client']['hot'], 'send' | 'on'> } } };

/**
 * ¿El proyecto activo es el Studio mismo (su repositorio es esta carpeta)? Solo entonces el director puede cambiar el
 * código del Studio, y solo entonces la página se recarga o el servidor se reinicia tras su trabajo (nota nmwc99ql2tit).
 */
export function activoEsElStudio(raiz: string): boolean {
  const l = leerLocalYa(raiz);
  const repo = l.activo ? l.repositorios[l.activo] : undefined;
  return !!repo && esElStudio(raiz, repo);
}

/** Lo que deja rastro: una recarga o un reinicio que el servidor SÍ le manda a la página con otro proyecto activo. */
export interface Rastro {
  tipo: 'recarga' | 'reinicio';
  /** Para la bitácora, en castellano como sus demás líneas. */
  causa: string;
  /** El archivo que la provocó, si Vite lo dice: la nota del Buzón arma su causa en el idioma de la persona. */
  archivo?: string;
}
/** Vite manda ráfagas: a lo más un rastro de cada clase en este tiempo. */
const ENTRE_RASTROS_MS = 60_000;

/** Los proyectos de este computador cuyo repositorio es el Studio mismo. Pura sobre lo leído. */
function idsDelStudio(raiz: string, l: ReturnType<typeof leerLocalYa>): string[] {
  return Object.entries(l.repositorios ?? {}).filter(([, repo]) => !!repo && esElStudio(raiz, repo)).map(([id]) => id);
}

/**
 * @param trabajandoAqui los proyectos cuyo director corre ahora en este servidor (revisor › revisandoEn), o solo si alguno corre.
 */
export function contenerRecargas(server: ServidorVite, raiz: string, trabajandoAqui: () => boolean | readonly string[], delStudio: () => boolean = () => activoEsElStudio(raiz), rastro?: (r: Rastro) => void): Contencion {
  // Deja rastro (bitácora y Buzón del activo) sin que una falla suya toque la recarga; una vez por clase cada minuto
  const ultimoRastro: Record<Rastro['tipo'], number> = { recarga: 0, reinicio: 0 };
  const dejarRastro = (r: Rastro) => {
    if (!rastro) return;
    const ahora = Date.now();
    if (ultimoRastro[r.tipo] && ahora - ultimoRastro[r.tipo] < ENTRE_RASTROS_MS) return;
    ultimoRastro[r.tipo] = ahora;
    try { rastro(r); } catch { /* el rastro nunca rompe la recarga */ }
  };
  // Una revisión solo pedida (aún sin lanzar ni empezar, sin cerrar ni fallar) también retiene: el director está por tomarla.
  // De cualquier proyecto (pd_revisiones_simultaneas): un reinicio nunca corta la revisión de otro proyecto que corre a la vez
  const pedidaSinCerrar = (l: ReturnType<typeof leerLocalYa>) => Object.values(l.revisiones ?? {}).some(revisionAbierta);
  const corren = () => {
    const x = trabajandoAqui();
    return typeof x === 'boolean' ? x : x.length > 0;
  };
  const ocupado = () => {
    if (corren()) return true;
    const l = leerLocalYa(raiz);
    return directorTrabajando(l) || pedidaSinCerrar(l);
  };
  // Para soltar una recarga sin reinicio basta con que el director del Studio mismo haya terminado: recargar la página no
  // toca la revisión de otro proyecto que corre a la vez (nota nmwpx2ai0tit: la recarga que dejó la revisión de STL
  // Studio quedaba retenida mientras la de «app» seguía, y llegaba diez minutos después, en pleno trabajo, al cerrar esa)
  const ocupadoElStudio = () => {
    const x = trabajandoAqui();
    const l = leerLocalYa(raiz);
    const ids = idsDelStudio(raiz, l);
    if (typeof x === 'boolean' ? x : x.some((id) => ids.includes(id))) return true;
    return ids.some((id) => directorTrabajando(l, id)) || Object.values(l.revisiones ?? {}).some((r) => ids.includes(r.proyecto) && revisionAbierta(r));
  };
  const hot = server.environments.client.hot;
  const enviar = hot.send.bind(hot) as (...a: unknown[]) => void;
  let recarga = false;
  let reinicio = false;
  // La revisión cuya recarga ya se soltó (su `pedida`): la página pregunta por lo retenido justo después de recibir el
  // aviso, y sin esto la respuesta ya era «nada» y terminaba en su sitio sin recargar (nota nmwdoij9etit, 12 de noviembre
  // de 2026: un cambio de la página del Studio no se vio hasta refrescar a mano). Vale hasta que se pida otra revisión
  let soltadaPara: string | null = null;
  const pedidaAhora = () => Object.values(leerLocalYa(raiz).revisiones ?? {}).map((r) => `${r.proyecto}@${r.pedida}`).sort().join('|') || null;
  // Con otro proyecto activo, lo que Vite quiera recargar o reiniciar mientras el director trabaja no llega a la página:
  // se pone al día en su sitio, sin recargarse (nota nmwc99ql2tit: solo el Studio se recarga o reinicia). Pero no se
  // olvida: se guarda hasta que la persona vuelve al Studio con el selector, y entonces llega, una vez, antes que nada
  // (nota del titular nmwmejhh0tit, pd_reinicio_al_volver: una revisión de STL Studio que terminó con otro proyecto activo
  // dejaba el servidor con el código viejo, y la comprobación al entregar respondía con su mensaje de antes)
  hot.send = ((...a: unknown[]) => {
    const p = a[0] as { type?: string } | undefined;
    if (p && typeof p === 'object' && (p.type === 'full-reload' || p.type === 'update') && ocupado()) {
      recarga = true;
      return;
    }
    // Una recarga que sí llega con otro proyecto activo deja rastro (la persona no la pidió: una con F5 no pasa por aquí).
    // `update` (HMR) no recarga la página; la recarga que el Studio suelta a su propia página tampoco es de aquí
    if (p && typeof p === 'object' && p.type === 'full-reload' && !delStudio()) {
      const q = p as { path?: unknown; triggeredBy?: unknown };
      const archivo = typeof q.triggeredBy === 'string' && q.triggeredBy ? q.triggeredBy : typeof q.path === 'string' && q.path && q.path !== '*' ? q.path : '';
      dejarRastro({ tipo: 'recarga', causa: archivo ? `Vite mandó una recarga completa por un cambio en ${archivo}` : 'Vite mandó una recarga completa', ...(archivo ? { archivo } : {}) });
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
    if (!delStudio()) dejarRastro({ tipo: 'reinicio', causa: 'el servidor del Studio se reinició (cambió un archivo del servidor)' });
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
    // Un reinicio espera a que no corra ninguna revisión; una recarga sola, solo a que termine la del Studio
    if ((!recarga && !reinicio) || (reinicio ? ocupado() : ocupadoElStudio())) return;
    // Con otro proyecto activo, lo retenido espera, sin soltarse ni olvidarse: llega cuando el activo vuelve a ser el Studio
    if (!delStudio()) return;
    const conReinicio = reinicio;
    recarga = reinicio = false;
    soltadaPara = pedidaAhora();
    enviar({ type: 'custom', event: EVENTO_RECARGA, data: { reinicio: conReinicio } });
    if (conReinicio) esperandoPagina = Date.now();
  }, 2000);
  reloj.unref?.();
  server.httpServer?.on('close', () => clearInterval(reloj));
  const yaSoltada = () => !!soltadaPara && pedidaAhora() === soltadaPara;
  return { retenida: () => delStudio() && (recarga || reinicio || !!esperandoPagina || yaSoltada()) };
}

/** El aviso a las páginas que ya estaban abiertas cuando abriste el Studio otra vez: la nueva ya está, esta le cede el lugar. */
export const EVENTO_CEDER = 'estudio:ceder';
/** Lo que la página vieja responde: se cierra, queda cubierta (el navegador no la dejó cerrarse) o espera a quedar libre. */
export const EVENTO_CEDIO = 'estudio:cedio';
/** Lo que se espera a que la pestaña nueva se conecte; si no llega (el navegador no se abrió), las viejas siguen igual. */
const ESPERA_PESTANA_NUEVA_MS = 2 * 60_000;

interface Pagina { send(evento: string, datos?: unknown): void; socket?: unknown }
interface Canal {
  readonly clients: Set<Pagina>;
  on(evento: 'vite:client:connect', f: (datos: unknown, pagina: Pagina) => void): void;
  off(evento: 'vite:client:connect', f: (datos: unknown, pagina: Pagina) => void): void;
}

/**
 * Abriste el Studio otra vez (doble clic) con el servidor ya encendido: el lanzador abre una pestaña nueva, al frente,
 * y aquí se anotan las páginas que ya estaban. Cuando la nueva se conecta, a cada una de ellas que siga abierta se le
 * pide ceder el lugar (se cierra, o queda cubierta). Antes de que la nueva llegue nada se toca: si el navegador no se
 * abrió, ninguna se cierra. Devuelve cuántas páginas había.
 */
export function cederALaNueva(canal: Canal, espera = ESPERA_PESTANA_NUEVA_MS): number {
  // Vite entrega cada página como un objeto con su conexión (`socket`): se comparan por ella
  const de = (p: Pagina) => p.socket ?? p;
  const viejas = [...canal.clients];
  if (!viejas.length) return 0;
  const yaEstaban = new Set(viejas.map(de));
  const alConectar = (_: unknown, nueva: Pagina) => {
    if (yaEstaban.has(de(nueva))) return;
    terminar();
    const siguen = new Set([...canal.clients].map(de));
    for (const p of viejas) if (siguen.has(de(p))) p.send(EVENTO_CEDER);
  };
  const reloj = setTimeout(() => terminar(), espera);
  reloj.unref?.();
  const terminar = () => {
    clearTimeout(reloj);
    canal.off('vite:client:connect', alConectar);
  };
  canal.on('vite:client:connect', alConectar);
  return viejas.length;
}
