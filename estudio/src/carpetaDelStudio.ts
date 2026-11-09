import { t } from './textos';

/**
 * La carpeta del Studio en este computador, para el aviso de servidor caído (nota de voz del titular nmw71bfm4tit, 7 de
 * noviembre de 2026: «el Studio debería saber dónde está y decirle al usuario dónde dar doble clic»). Con el servidor
 * apagado la página ya no puede preguntarla: la guarda mientras el servidor responde (la primera carga, con la última
 * caída: api.ts › /caida) y el aviso la nombra entera, con el doble clic en «Abrir STL Studio.cmd» primero y
 * «npm run encender» después.
 */
const CLAVE = 'stl-carpeta-del-studio';

/** Guarda la ruta que dio el servidor; lo que no sea una ruta no se guarda. */
export function guardarCarpetaDelStudio(ruta: unknown, almacen: Pick<Storage, 'setItem'> | undefined = globalThis.localStorage): void {
  if (typeof ruta !== 'string' || !ruta.trim()) return;
  try { almacen?.setItem(CLAVE, ruta.trim()); } catch { /* sin almacenamiento, el aviso dice «la carpeta del Studio» */ }
}

/** La ruta guardada, o '' si no hay. */
export function carpetaGuardada(almacen: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage): string {
  try { return almacen?.getItem(CLAVE) ?? ''; } catch { return ''; }
}

/** Cómo la nombran los avisos: «la carpeta del Studio, C:\…» o, sin ruta guardada, «la carpeta del Studio». */
export function laCarpetaDelStudio(ruta = carpetaGuardada()): string {
  return ruta ? t('servidor.carpetaConRuta', { ruta }) : t('servidor.carpetaSinRuta');
}
