// Las líneas de «La bitácora de este computador» son tipos fijos (la clave de su frase y sus datos, src/director/textoBitacora.ts)
// y salen en el idioma de este computador en el momento de LEERLAS (api.ts › GET /bitacora): `idiomaDeEsteComputador` pone el
// último que se eligió aquí (`leerLocal(raiz).idioma`, y 'en' si nunca se eligió: el inglés es el idioma principal del Studio)
// y la ruta dice cada frase con `t`. Ya no importa en qué idioma estaba el servidor al escribirla. `anotarEnSuIdioma` queda
// para donde no hay página (los temporizadores, el chequeo de salud, el lanzador del director, la transcripción): arma la línea
// después de poner ese idioma, por si algún dato la necesita.
import { anotar, type EventoPorAnotar } from '../../src/director/bitacora.ts';
import { leerLocal } from '../../src/director/proyectos.ts';
import { ponerIdioma } from '../src/textos.ts';

/** Pone el idioma del servidor: el guardado en este computador, o 'en'. Si no se puede leer, deja el que había. */
export async function idiomaDeEsteComputador(raiz: string): Promise<void> {
  try {
    ponerIdioma((await leerLocal(raiz)).idioma ?? 'en');
  } catch {
    // Sin la configuración, sigue en el idioma de ahora
  }
}

/** Anota una línea cuyo texto se arma recién cuando el idioma ya está puesto: `hacer` arma sus tipos fijos (`tb(...)`). */
export async function anotarEnSuIdioma(raiz: string, hacer: () => EventoPorAnotar): Promise<void> {
  await idiomaDeEsteComputador(raiz);
  await anotar(raiz, hacer());
}
