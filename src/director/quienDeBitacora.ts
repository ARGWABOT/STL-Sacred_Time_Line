// Quién firma cada línea de la bitácora, en el idioma de ahora (nota nmwp6vl8gtit). Aparte de bitacora.ts, que usa el
// disco, para que la página la pueda importar sin módulos de Node.
import { t } from '../../estudio/src/textos.ts';

/** Los que el sistema hace solo firman así: nunca con el nombre de una persona. */
export const EL_STUDIO = 'el Studio';

/** Las marcas internas con que firma la bitácora (`EL_STUDIO`, «el director», «alguien»), en el idioma de ahora; un nombre de persona queda igual. */
const QUIENES = { [EL_STUDIO]: 'bitacora.quien.studio', 'el director': 'bitacora.quien.director', alguien: 'bitacora.quien.alguien', 'alguien en este computador': 'bitacora.quien.alguienAqui' } as const;
export const quienEnSuIdioma = (quien: string): string => (Object.hasOwn(QUIENES, quien) ? t(QUIENES[quien as keyof typeof QUIENES]) : quien);
