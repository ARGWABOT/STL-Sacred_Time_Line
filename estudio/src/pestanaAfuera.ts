// La pestaña de afuera, una sola y reusada (nota de voz del titular nmwmttqt0tit, 19 de noviembre de 2026: «la tab a la que
// el estudio mande debe ser reutilizable»; cuatro misiones seguidas le habían dejado cuatro pestañas abiertas). Todo botón
// o enlace del Studio que lleva a una página fuera del Studio la abre en la misma pestaña, con su nombre fijo: la primera
// vez se abre, y las siguientes la cargan ahí y la traen al frente. Los atajos a la aplicación de un proyecto siguen con su
// propia pestaña por proyecto (atajo.ts › ventanaDelAtajo, nmwimp4sxtit), porque su sesión termina al cerrarla.
//
// Sin soltar el `opener` (nmwmwm6pstit, 19 de noviembre: cada clic seguía abriendo una pestaña nueva, aun dos veces el
// mismo botón). Soltarlo (`ventana.opener = null`, o `noopener` en `window.open`) deja la pestaña sin parentesco con el
// Studio: el navegador la pasa a otro grupo al cargar una página de otro sitio y le borra el nombre, y el siguiente
// `window.open` con ese nombre ya no la encuentra. Las páginas de afuera son las del propio Studio, GitHub y Anthropic.

//
// Lo mismo vale para la pestaña del atajo de cada proyecto (nota nmwo5rfhctit, 19 de noviembre: el atajo de «app», en
// localhost:8090, abría una pestaña nueva en cada clic, y el de STL no). El atajo soltaba el `opener` al abrirla: con la
// página del propio Studio (mismo origen) el navegador la seguía encontrando por su nombre, pero con la aplicación de otro
// proyecto (otro puerto, otro origen) el Studio deja de estar «emparentado» con ella y el siguiente `window.open` con ese
// nombre crea otra. Por eso los dos abren por `abrirConNombre`, la regla «una pestaña reusada por proyecto para los atajos
// y los enlaces de afuera» (reglasDelTitular.ts › una_pestana_reusada).
import { ventanaDelAtajo } from '../../src/director/atajo';

/** El nombre de la pestaña que el Studio reusa para todo lo de afuera. */
export const PESTANA_DE_AFUERA = 'stl-afuera';

type Abrir<V extends Pick<Window, 'focus'> = Pick<Window, 'focus'>> = (url: string, nombre: string, opciones?: string) => V | null;

/**
 * Abre `url` en la pestaña de ese nombre, reusada: el navegador carga la página en la que ya existe y, si no existe, la
 * crea; luego la trae al frente. Nunca con `noopener` ni soltando el `opener`, que le quitan el nombre (arriba).
 */
function abrirConNombre<V extends Pick<Window, 'focus'>>(url: string, nombre: string, abrir: Abrir<V>): V | null {
  const ventana = abrir(url, nombre);
  if (!ventana) return null;
  try {
    ventana.focus();
  } catch {
    /* el navegador decide si la trae al frente */
  }
  return ventana;
}

/**
 * Abre `url` en la pestaña de afuera, reusada. Devuelve si se pudo abrir (un bloqueador de ventanas emergentes puede
 * impedirlo).
 */
export function abrirEnLaPestana(url: string, abrir: Abrir = (u, n) => window.open(u, n)): boolean {
  return !!abrirConNombre(url, PESTANA_DE_AFUERA, abrir);
}

/**
 * Abre el atajo de un proyecto en su propia pestaña, reusada en cada clic, sea cual sea el puerto de su aplicación
 * (nmwimp4sxtit, nmwo5rfhctit). Devuelve la ventana, que el Studio vigila para cerrar la sesión al cerrarse, o null.
 */
export function abrirElAtajo<V extends Pick<Window, 'focus'> = Window>(url: string, proyecto: string, abrir: Abrir<V> = (u, n) => window.open(u, n) as V | null): V | null {
  return abrirConNombre(url, ventanaDelAtajo(proyecto), abrir);
}

/**
 * Si un clic en un enlace del Studio que abre pestaña nueva (`target="_blank"`) va a la pestaña de afuera: un clic normal,
 * sin teclas (con Ctrl, Mayús o el botón central, el navegador hace lo suyo) y a una dirección web. Pura.
 */
export function vaALaPestana(c: { boton: number; teclas: boolean; target: string | null; href: string | null }): boolean {
  return c.boton === 0 && !c.teclas && c.target === '_blank' && !!c.href && /^https?:/i.test(c.href);
}
