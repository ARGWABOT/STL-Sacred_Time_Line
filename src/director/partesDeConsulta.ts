// Aligerar cada consulta (pedido pd_aligerar_consulta): la página pregunta cada 30 segundos, y cada 10 con una revisión en
// marcha, y cada vez le llegaban casi 5 MB, aunque nada hubiera cambiado. Ahora dice lo que ya tiene, una huella por parte, y
// el servidor manda solo las que cambiaron: el resto se reconstruye con lo que la página ya recibió, así que ninguna vista
// deja de tener lo que tenía. Los intervalos no cambian (t_decide_aligerar_oculta). Puro: sirve al servidor y a la página.

/**
 * Las partes que se pueden ahorrar, de las que pesan. «plan» y «estado» son lo que queda de cada uno sin sus partes hijas, que
 * van antes en la lista. Lo que no está aquí viaja siempre: es poco.
 */
const PARTES_DE_CONSULTA = [
  'plan.respuestas', 'plan.misiones', 'plan.pedidos', 'plan.revisiones', 'plan.propuestas', 'plan',
  'estado.notas', 'estado.bitacora', 'estado',
  'transcripciones', 'consumo', 'conversacion', 'lineaHistoria', 'senales', 'medidaDelDirector', 'ajustesPropios',
] as const;

type Cuerpo = Record<string, any>;
const CONTENEDORES = new Set(PARTES_DE_CONSULTA.filter((p) => PARTES_DE_CONSULTA.some((o) => o.startsWith(`${p}.`))) as string[]);
const hijasDe = (raiz: string) => PARTES_DE_CONSULTA.filter((p) => p.startsWith(`${raiz}.`)).map((p) => p.slice(raiz.length + 1));

/** Lo que queda de un contenedor sin sus partes hijas. */
function restoDe(raiz: string, x: Cuerpo | undefined): Cuerpo | undefined {
  if (!x) return undefined;
  const resto = { ...x };
  for (const hija of hijasDe(raiz)) delete resto[hija];
  return resto;
}

/** El valor de una parte en el cuerpo de una respuesta, si viene. */
function valorDe(cuerpo: Cuerpo, parte: string): unknown {
  const [raiz, hija] = parte.split('.');
  if (hija) return cuerpo[raiz]?.[hija];
  return CONTENEDORES.has(raiz) ? restoDe(raiz, cuerpo[raiz]) : cuerpo[raiz];
}

/** Lo que la página dice que tiene: «parte~huella» separadas por comas. */
export const escribirTengo = (tengo: Iterable<readonly [string, string]>): string => [...tengo].map(([p, h]) => `${p}~${h}`).join(',');
export function leerTengo(texto: string | null | undefined): Map<string, string> {
  return new Map((texto ?? '').split(',').flatMap((x) => {
    const [p, h] = x.split('~');
    return p && h ? [[p, h] as const] : [];
  }));
}

/** Lo que dice la respuesta de cada parte: su huella y si es igual a la que la página ya tiene, y por eso no viene. */
export interface PartesDeRespuesta {
  huellas: Record<string, string>;
  iguales: string[];
}

/**
 * El cuerpo de la respuesta, sin las partes que la página ya tiene iguales. `huella` la da el servidor, que tiene con qué
 * calcularla. Sin `tengo`, viene todo. Pura.
 */
export function partirConsulta<C extends Cuerpo>(cuerpo: C, tengo: ReadonlyMap<string, string>, huella: (texto: string) => string): C & { partes: PartesDeRespuesta } {
  const salida: Cuerpo = { ...cuerpo };
  for (const raiz of CONTENEDORES) if (salida[raiz]) salida[raiz] = { ...salida[raiz] };
  const partes: PartesDeRespuesta = { huellas: {}, iguales: [] };
  for (const parte of PARTES_DE_CONSULTA) {
    const valor = valorDe(cuerpo, parte);
    if (valor === undefined) continue;
    const h = huella(JSON.stringify(valor));
    partes.huellas[parte] = h;
    if (tengo.get(parte) !== h) continue;
    partes.iguales.push(parte);
    const [raiz, hija] = parte.split('.');
    if (hija) delete salida[raiz][hija];
    else if (CONTENEDORES.has(raiz)) for (const k of Object.keys(restoDe(raiz, cuerpo[raiz]) ?? {})) delete salida[raiz][k];
    else delete salida[raiz];
  }
  return { ...salida, partes } as C & { partes: PartesDeRespuesta };
}

/** Lo que la página ya recibió de cada parte, con su huella: lo que manda en cada consulta como «lo que tengo». */
export type MemoriaDePartes = Map<string, { huella: string; valor: unknown }>;

/**
 * Los datos enteros, otra vez: lo que vino y, de lo que no vino por igual, lo que la página ya tenía. Cada contenedor sale nuevo,
 * con sus partes en el mismo orden, y lo que no cambió es el mismo objeto de la vez anterior: así la página sabe sin leerlo
 * entero que no cambió. Una respuesta sin `partes` queda como vino. Pura, salvo `memoria`, que se le da para eso.
 */
export function unirConsulta<D extends Cuerpo>(recibido: D & { partes?: PartesDeRespuesta }, memoria: MemoriaDePartes): D {
  const { partes, ...cuerpo } = recibido;
  if (!partes) return recibido;
  const salida: Cuerpo = { ...cuerpo };
  const hijas = new Map<string, Cuerpo>();
  for (const parte of PARTES_DE_CONSULTA) {
    const h = partes.huellas[parte];
    const [raiz, hija] = parte.split('.');
    if (!h) {
      memoria.delete(parte);
      continue;
    }
    const valor = partes.iguales.includes(parte) ? memoria.get(parte)?.valor : valorDe(cuerpo, parte);
    memoria.set(parte, { huella: h, valor });
    if (hija) hijas.set(raiz, { ...hijas.get(raiz), [hija]: valor });
    else if (CONTENEDORES.has(raiz)) salida[raiz] = { ...(valor as Cuerpo), ...hijas.get(raiz) };
    else salida[raiz] = valor;
  }
  return salida as D;
}

/** ¿Son los mismos datos, sin leerlos enteros? Lo son si cada cosa de primer nivel es el mismo objeto. Pura. */
export function mismoPorEncima(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const ka = Object.keys(a);
  return ka.length === Object.keys(b).length && ka.every((k) => (a as Cuerpo)[k] === (b as Cuerpo)[k]);
}
