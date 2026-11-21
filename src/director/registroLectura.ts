// El registro de lo que recorriste con la niebla (pedido pd_registro_lectura; nota de voz del titular nmvmxm8gjtit, 24 de
// octubre de 2026): cada bloque que el director de la niebla recorre, arrastrado o con ▶, queda anotado por persona y por
// proyecto en este computador, fuera de git (.estudio/lectura/<proyecto>/<persona>.json, estudio/servidor/lectura.ts), sin tope ni olvido. Antes lo
// recordaba solo el navegador, y solo los últimos 400 bloques: lo leído hace días volvía a nublarse.
//
// No prueba que se leyó, pero sí que se vio pasar. Lo que se destapa de una vez al soltar al director (el arrastre que
// reubica rápido, nota nmvmzeviqtit) se anota aparte, en `saltado`: se saltó, no se vio pasar; en pantalla se ve igual
// que lo recorrido, como eligió el titular el 26 de octubre (t_niebla_saltado). Y «Volver a nublar» (t_niebla_releer) nubla
// de nuevo lo de una pantalla para releerlo despacio sin borrar el registro: `punto` vuelve al principio, pero `hasta`,
// `saltado` y `cuando` siguen diciendo lo que se recorrió y cuándo.

/** Lo anotado de un bloque, por la huella de su texto (guiaLectura.ts › huellaDe). */
export interface EntradaLectura {
  /** Hasta qué palabra está destapado ahora (-1, nada): lo que se ve sin niebla. */
  punto: number;
  /** Lo más lejos que llegó alguna vez: «Volver a nublar» no lo borra. */
  hasta: number;
  /** La última vez que el director lo recorrió (ms). */
  cuando: number;
  /** Los tramos de palabras [desde, hasta] que se destaparon de una vez al soltar al director, sin verlos pasar. */
  saltado?: [number, number][];
  /** Cuándo se volvió a nublar (ms), si se volvió a nublar. */
  nublado?: number;
}

export type RegistroLectura = Record<string, EntradaLectura>;

const esEntrada = (e: unknown): e is EntradaLectura =>
  !!e && typeof e === 'object' && typeof (e as EntradaLectura).punto === 'number' && typeof (e as EntradaLectura).hasta === 'number' && typeof (e as EntradaLectura).cuando === 'number';

/** Un registro leído de un archivo o de una petición: solo las entradas bien formadas. */
export function registroValido(x: unknown): RegistroLectura {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return {};
  return Object.fromEntries(Object.entries(x).filter(([, e]) => esEntrada(e))) as RegistroLectura;
}

/** Junta dos tramos saltados que se tocan o se pisan, en orden. */
function juntarTramos(tramos: [number, number][]): [number, number][] {
  const orden = [...tramos].sort((a, b) => a[0] - b[0]);
  const salida: [number, number][] = [];
  for (const [a, b] of orden) {
    const u = salida.at(-1);
    if (u && a <= u[1] + 1) u[1] = Math.max(u[1], b);
    else salida.push([a, b]);
  }
  return salida;
}

/**
 * El registro con el avance de un bloque: hasta dónde está destapado ahora y cuándo; `hasta` nunca baja. Con `salto` (el
 * tramo que se destapó de una vez al soltar al director), ese tramo queda en `saltado`, salvo lo que ya se había visto
 * pasar antes; lo que se recorre después sobre un tramo saltado lo saca de ahí: ya se vio pasar.
 */
export function conAvance(reg: RegistroLectura, huella: string, punto: number, cuando: number, salto?: [number, number]): RegistroLectura {
  const antes = reg[huella];
  const hasta = Math.max(antes?.hasta ?? -1, punto);
  let saltado = antes?.saltado ?? [];
  if (salto && salto[1] >= salto[0]) {
    const desde = Math.max(salto[0], (antes?.hasta ?? -1) + 1);
    if (desde <= salto[1]) saltado = juntarTramos([...saltado, [desde, salto[1]]]);
  }
  const e: EntradaLectura = { punto, hasta, cuando };
  if (saltado.length) e.saltado = saltado;
  if (antes?.nublado) e.nublado = antes.nublado;
  return { ...reg, [huella]: e };
}

/** «Volver a nublar»: lo de esas huellas vuelve a la niebla, sin borrar lo que se recorrió ni cuándo. */
export function nubladoDeNuevo(reg: RegistroLectura, huellas: string[], cuando: number): RegistroLectura {
  const nuevo = { ...reg };
  for (const h of huellas) if (nuevo[h]) nuevo[h] = { ...nuevo[h], punto: -1, nublado: cuando };
  return nuevo;
}

/** Hasta qué palabra se ve destapado un bloque (-1, nada). */
export const puntoDe = (reg: RegistroLectura, huella: string) => reg[huella]?.punto ?? -1;

/** Junta dos registros (el de este computador y lo que llega de la página): por bloque, el más nuevo. */
export function juntarRegistros(a: RegistroLectura, b: RegistroLectura): RegistroLectura {
  const salida = { ...a };
  for (const [h, e] of Object.entries(b)) {
    const x = salida[h];
    if (!x || Math.max(e.cuando, e.nublado ?? 0) >= Math.max(x.cuando, x.nublado ?? 0)) salida[h] = e;
  }
  return salida;
}
