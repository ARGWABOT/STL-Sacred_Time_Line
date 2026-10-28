// El paquete de cada revisión (pedido del titular del 23 de octubre de 2026, «El paquete entero de cada revisión, para
// revisarlo»): lo que recibe al empezar el director que lanza el Studio, guardado junto a su registro para abrirlo desde
// «Modelo y consumo» y medirlo. Es la línea base para medir cada pieza que achica su contexto. Junto al registro
// (.revisiones/<nombre>.log) quedan el encargo con que se lanzó (<nombre>.encargo.txt, que escribe el lanzador antes de
// mandarlo) y lo que le imprimió la bandeja (<nombre>.bandeja.txt, que escribe la bandeja misma, avisada por la variable
// STL_REGISTRO). Fuera de git, como los registros.
import { appendFileSync, existsSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { format } from 'node:util';

/** La carpeta de los registros de los lanzamientos, dentro de la del Studio. */
export const REVISIONES = '.revisiones';

/** «<proyecto>-[aclaracion-|urgencia-]<fecha>.log», con la fecha sin «:» ni «.»: el nombre de cada registro. */
export const REGISTRO = /^([a-z0-9][a-z0-9-]*?)-(?:(aclaracion|urgencia)-)?(\d{4}-\d\d-\d\d)T(\d\d)-(\d\d)-(\d\d)-(\d{3})Z\.log$/;

/** La variable con que el lanzador le dice al director (y a la bandeja que él corre) la ruta absoluta de su registro. */
export const VARIABLE_REGISTRO = 'STL_REGISTRO';

/** Las partes del paquete que se abren desde el Studio. */
export const PARTES = ['encargo', 'bandeja'] as const;
export type ParteDelPaquete = (typeof PARTES)[number];

/** Las rutas del paquete de un registro: el mismo nombre sin «.log», con «.encargo.txt» y «.bandeja.txt». Pura. */
export function paqueteDeRegistro(archivo: string): Record<ParteDelPaquete, string> {
  const base = archivo.replace(/\.log$/, '');
  return { encargo: `${base}.encargo.txt`, bandeja: `${base}.bandeja.txt` };
}

/**
 * Los tokens de un texto, estimados: sus caracteres entre 4, hacia arriba (la regla de bolsillo; en español y con código
 * suele quedarse un poco corta). No es lo que cuenta la API: lo exacto es el arranque, los tokens de la primera llamada
 * del director, que dice su registro (revisor.ts › consumoDe).
 */
export const tokensEstimados = (texto: string) => Math.ceil(texto.length / 4);

/**
 * Dónde guarda la bandeja lo que imprime, o null si no lo guarda: solo cuando la corre el director que lanzó el Studio
 * (la variable apunta a un registro que existe, por su nombre, dentro de la carpeta .revisiones de este Studio) y la
 * orden no es el cierre (--listo). Una ruta de otro lugar o con otro nombre no se toca. Pura, salvo `existe`.
 */
export function bandejaDelPaquete(registro: string | undefined, raiz: string, args: readonly string[], existe: (archivo: string) => boolean = existsSync): string | null {
  if (!registro || args.includes('--listo')) return null;
  const archivo = resolve(registro);
  // relative compara como el sistema (en Windows, sin distinguir mayúsculas): vacío, la misma carpeta
  if (relative(resolve(raiz, REVISIONES), dirname(archivo)) !== '' || !REGISTRO.test(basename(archivo)) || !existe(archivo)) return null;
  return paqueteDeRegistro(archivo).bandeja;
}

/**
 * Lo pendiente que no está en la cola del director (lo de las fases que vienen y lo de después del lanzamiento), por fase
 * y en el orden de la ruta, con lo que no es de ninguna fase de la ruta al final: en el paquete de cada revisión va solo
 * por su id, porque no se trabaja ahora y su texto está en el plan (propuesta aceptada pr_encargo_a_medida: el paquete,
 * solo con lo que sirve a cada revisión). Dentro de cada fase, en el orden en que llegan. Pura.
 */
export function idsPorFase(cosas: readonly { id: string; fase: string }[], fases: readonly string[]): { fase: string; ids: string[] }[] {
  const lugar = (fase: string) => (fases.includes(fase) ? fases.indexOf(fase) : fases.length);
  const grupos = new Map<string, string[]>();
  for (const c of [...cosas].sort((a, b) => lugar(a.fase) - lugar(b.fase))) grupos.set(c.fase, [...(grupos.get(c.fase) ?? []), c.id]);
  return [...grupos].map(([fase, ids]) => ({ fase, ids }));
}

/** Cuántos días atrás llega «Lo que pediste hacer fuera del Studio»: lo de antes ya es historia, y buscar.ts lo encuentra. */
export const DIAS_FUERA_DEL_STUDIO = 2;

/** La línea que va antes de cada vez que corre la bandeja en una revisión: con qué opciones y a qué hora. */
export const separadorDeBandeja = (args: readonly string[], cuando = new Date()) =>
  `──── node tools/director/bandeja.ts${args.length ? ` ${args.join(' ')}` : ''} · ${cuando.toISOString()} ────\n`;

type Consola = Pick<Console, 'log' | 'info' | 'warn' | 'error'>;

/**
 * Copia en `destino` todo lo que la bandeja imprime con la consola (log, info, warn y error), en orden y sin cambiar lo
 * que imprime: su separador primero y después cada línea, al final del archivo, a medida que se imprime. No espera a la
 * salida: si la bandeja muere a mitad (el límite de la orden, el corte de la revisión), lo que el director alcanzó a
 * recibir queda guardado. Lo que imprime un proceso hijo con la salida heredada (la transcripción) no pasa por la consola
 * y no se copia. Si no puede escribir, deja de intentarlo y la bandeja sigue sin error.
 */
export function copiarSalida(destino: string, separador: string, consola: Consola = console): void {
  let escribe = true;
  const agregar = (texto: string) => {
    if (!escribe) return;
    try {
      appendFileSync(destino, texto, 'utf8');
    } catch {
      // sin disco no hay paquete, pero la bandeja sigue imprimiendo lo suyo
      escribe = false;
    }
  };
  agregar(separador);
  for (const k of ['log', 'info', 'warn', 'error'] as const) {
    const original = consola[k].bind(consola);
    consola[k] = (...xs: unknown[]) => {
      original(...xs);
      agregar(`${format(...xs)}\n`);
    };
  }
}

/**
 * El archivo de una parte del paquete que pide la página, o null si el pedido no vale: el nombre de un registro (solo lo
 * que cumple REGISTRO: nada de rutas, «..» ni barras) y una de sus partes. Nunca sale de la carpeta .revisiones. Pura.
 */
export function archivoDelPaquete(raiz: string, registro: unknown, parte: unknown): string | null {
  if (typeof registro !== 'string' || !REGISTRO.test(registro) || !PARTES.includes(parte as ParteDelPaquete)) return null;
  return paqueteDeRegistro(join(raiz, REVISIONES, registro))[parte as ParteDelPaquete];
}
