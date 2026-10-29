import type { Plan } from './director.ts';

/**
 * Escribir el plan con cambios puntuales (propuesta aceptada pr_encargo_a_medida, «El director arma el contexto de cada
 * encargo», punto 1: «el director deja de leer el plan entero y escribe con cambios puntuales»). Para cambiarlo con la
 * herramienta de editar, el director tenía que leerlo entero, y en STL Studio pesa cerca de 190 KB. Con un parche escribe
 * solo lo que cambia, y `bandeja.ts --aplicar` lo junta con el plan y lo guarda solo si no le suma errores (validarPlan).
 *
 * Cómo se junta cada clave del parche:
 * - por clave (`respuestas`, `revisiones`, `evaluacion`, `ejecutadas`, `reservaCorta`): la de cada clave se suma o se
 *   reemplaza, y con null sale;
 * - por id (`misiones`, `propuestas`, `pedidos`, `fases`, `frentes`; `documentos`, por su ruta): la que tiene ese id se
 *   reemplaza entera, o se suma al final;
 * - `cambiar`: unos campos de lo que ya está, por id (`{ "misiones": { "t_x": { "vigente": "…", "despuesDe": null } } }`),
 *   y con null el campo sale; una lista de adentro, por posición (porPosicion);
 * - `quitar`: lo que sale de una lista, por id (`{ "misiones": ["t_x"] }`);
 * - `orden`: cambiar el orden de una lista sin sacar nada (`{ "misiones": ["t_b", "t_a"] }`): las nombradas quedan en
 *   ese orden, en los lugares que ocupaban, y las demás no se mueven. Para reordenar no se quita y se vuelve a sumar:
 *   entre un parche y el otro, lo que la persona ya entregó o empezó quedaba sin su misión, y el Studio rechazaba cada
 *   decisión suya con «Hay una entrega de una misión que no está» (nota del titular nmvsv9ihxtit, 28 de octubre de 2026);
 * - lo demás del plan se reemplaza entero, y con null sale. `revisado` no: lo pone el cierre (--listo).
 */
const POR_CLAVE = ['respuestas', 'revisiones', 'evaluacion', 'ejecutadas', 'reservaCorta'];
const POR_ID = { misiones: 'id', propuestas: 'id', pedidos: 'id', fases: 'id', frentes: 'id', documentos: 'ruta' } as const;
const ENTEROS = ['mensaje', 'resumen', 'tramo', 'piezaSiguiente', 'alDia', 'colaAutorizada', 'colaDirector', 'boletin', 'ritmo', 'detectado', 'diagnostico', 'objetivos', 'lecciones', 'adelantado', 'nota', 'mision', 'actualizado'];

type Registro = Record<string, unknown>;
const esObjeto = (x: unknown): x is Registro => !!x && typeof x === 'object' && !Array.isArray(x);
const esLista = (clave: string): clave is keyof typeof POR_ID => Object.hasOwn(POR_ID, clave);

/**
 * Una lista dentro de algo que se cambia (las misiones previstas de una fase, los pasos de una misión), por posición,
 * sin reenviarla entera: `{ "0": "…" }` reemplaza la primera, `{ "3": null }` la quita y `{ "+": ["…"] }` suma al final.
 * La lista nueva, o por qué no se entiende.
 */
function porPosicion(lista: unknown[], cambios: Registro): unknown[] | string {
  const nueva = [...lista];
  const quitar: number[] = [];
  for (const [k, v] of Object.entries(cambios)) {
    if (k === '+') nueva.push(...(Array.isArray(v) ? v : [v]));
    else if (/^\d+$/.test(k) && Number(k) < lista.length) {
      if (v === null) quitar.push(Number(k));
      else nueva[Number(k)] = v;
    } else return `«${k}» no es una posición de la lista (de 0 a ${lista.length - 1}, o «+» para sumar al final).`;
  }
  return nueva.filter((_, i) => !quitar.includes(i));
}

/** El plan con el parche aplicado, lo que cambió (una línea por clave) y, si algo del parche no se entiende, el plan tal cual y por qué. Pura. */
export function aplicarParche(plan: Plan, parche: unknown): { plan: Plan; hecho: string[]; errores: string[] } {
  if (!esObjeto(parche)) return { plan, hecho: [], errores: ['El parche no es un objeto JSON.'] };
  const nuevo: Registro = structuredClone(plan) as unknown as Registro;
  const hecho: string[] = [];
  const errores: string[] = [];
  const listaDe = (clave: keyof typeof POR_ID) => [...((nuevo[clave] as Registro[] | undefined) ?? [])];

  for (const [clave, valor] of Object.entries(parche)) {
    if (clave === 'cambiar' || clave === 'quitar' || clave === 'orden') continue;
    if (POR_CLAVE.includes(clave)) {
      if (!esObjeto(valor)) {
        errores.push(`«${clave}» va como un objeto, por clave.`);
        continue;
      }
      const actual: Registro = { ...(esObjeto(nuevo[clave]) ? nuevo[clave] : {}) };
      for (const [k, v] of Object.entries(valor)) {
        if (v === null) delete actual[k];
        else actual[k] = v;
      }
      nuevo[clave] = actual;
      hecho.push(`${clave}: ${Object.keys(valor).join(', ')}`);
    } else if (esLista(clave)) {
      const campo = POR_ID[clave];
      if (!Array.isArray(valor) || valor.some((x) => !esObjeto(x) || typeof x[campo] !== 'string')) {
        errores.push(`«${clave}» va como una lista, cada uno con su ${campo}.`);
        continue;
      }
      const lista = listaDe(clave);
      const dichos: string[] = [];
      for (const x of valor as Registro[]) {
        const i = lista.findIndex((y) => y[campo] === x[campo]);
        if (i >= 0) lista[i] = x;
        else lista.push(x);
        dichos.push(i >= 0 ? String(x[campo]) : `${x[campo]} (nuevo)`);
      }
      nuevo[clave] = lista;
      hecho.push(`${clave}: ${dichos.join(', ')}`);
    } else if (ENTEROS.includes(clave)) {
      if (valor === null) delete nuevo[clave];
      else nuevo[clave] = valor;
      hecho.push(clave);
    } else errores.push(`«${clave}» no se cambia con un parche${clave === 'revisado' ? ': lo pone el cierre (--listo)' : ': no es una clave del plan'}.`);
  }

  // Después de lo de arriba, para poder cambiar o quitar lo que el mismo parche sumó
  const porLista = (que: 'cambiar' | 'quitar' | 'orden', forma: string) => {
    const valor = parche[que];
    if (valor === undefined) return [];
    if (!esObjeto(valor) || Object.keys(valor).some((c) => !esLista(c))) {
      errores.push(`«${que}» va como ${forma}, con solo ${Object.keys(POR_ID).join(', ')}.`);
      return [];
    }
    return Object.entries(valor) as [keyof typeof POR_ID, unknown][];
  };
  for (const [clave, porId] of porLista('cambiar', '{ "<lista>": { "<id>": { "<campo>": valor } } }')) {
    const campo = POR_ID[clave];
    const lista = listaDe(clave);
    if (!esObjeto(porId)) {
      errores.push(`«cambiar» › «${clave}» va por id: { "<id>": { "<campo>": valor } }.`);
      continue;
    }
    for (const [id, campos] of Object.entries(porId)) {
      const i = lista.findIndex((y) => y[campo] === id);
      if (i < 0 || !esObjeto(campos) || Object.hasOwn(campos, campo)) {
        errores.push(i < 0 ? `«cambiar» › «${clave}»: no hay ${id}.` : `«cambiar» › «${clave}» › ${id}: van sus campos, sin cambiar su ${campo}.`);
        continue;
      }
      const x: Registro = { ...lista[i] };
      for (const [k, v] of Object.entries(campos)) {
        if (v === null) delete x[k];
        else if (Array.isArray(x[k]) && esObjeto(v)) {
          const r = porPosicion(x[k] as unknown[], v);
          if (typeof r === 'string') errores.push(`«cambiar» › «${clave}» › ${id} › ${k}: ${r}`);
          else x[k] = r;
        } else x[k] = v;
      }
      lista[i] = x;
    }
    nuevo[clave] = lista;
    hecho.push(`cambiar ${clave}: ${Object.keys(porId).join(', ')}`);
  }
  for (const [clave, ids] of porLista('quitar', '{ "<lista>": ["<id>", …] }')) {
    const campo = POR_ID[clave];
    const lista = listaDe(clave);
    if (!Array.isArray(ids) || ids.some((x) => typeof x !== 'string')) {
      errores.push(`«quitar» › «${clave}» va como una lista de ids.`);
      continue;
    }
    const faltan = ids.filter((id) => !lista.some((y) => y[campo] === id));
    if (faltan.length) errores.push(`«quitar» › «${clave}»: no hay ${faltan.join(', ')}.`);
    nuevo[clave] = lista.filter((y) => !ids.includes(y[campo] as string));
    hecho.push(`quitar ${clave}: ${ids.join(', ')}`);
  }
  for (const [clave, ids] of porLista('orden', '{ "<lista>": ["<id>", …] }')) {
    const campo = POR_ID[clave];
    const lista = listaDe(clave);
    if (!Array.isArray(ids) || ids.some((x) => typeof x !== 'string') || new Set(ids).size !== ids.length) {
      errores.push(`«orden» › «${clave}» va como una lista de ids, sin repetir.`);
      continue;
    }
    const faltan = ids.filter((id) => !lista.some((y) => y[campo] === id));
    if (faltan.length) {
      errores.push(`«orden» › «${clave}»: no hay ${faltan.join(', ')}.`);
      continue;
    }
    // Los lugares que ocupan las nombradas, de arriba abajo, se llenan con ellas en el orden dado
    const lugares = lista.flatMap((y, i) => (ids.includes(y[campo] as string) ? [i] : []));
    const porId = new Map(lista.map((y) => [y[campo], y]));
    lugares.forEach((i, k) => (lista[i] = porId.get(ids[k])!));
    nuevo[clave] = lista;
    hecho.push(`orden ${clave}: ${ids.join(', ')}`);
  }

  return errores.length ? { plan, hecho: [], errores } : { plan: nuevo as unknown as Plan, hecho, errores };
}
