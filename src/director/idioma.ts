// El idioma de la interfaz (pedido pd_idiomas): se guarda en la configuración de este computador, para todos los proyectos
// a la vez y fuera de git (t_decide_idioma_guardado). Puro: lo usan el servidor y la página.

export const IDIOMAS = ['es', 'en'] as const;
export type Idioma = (typeof IDIOMAS)[number];

export const esIdioma = (x: unknown): x is Idioma => IDIOMAS.includes(x as Idioma);

/** La primera vez, el del navegador: en español si está en español, en inglés en cualquier otro caso (pd_idiomas). */
export const idiomaDelNavegador = (lengua: string | undefined): Idioma => (/^es\b/i.test(lengua ?? '') ? 'es' : 'en');
