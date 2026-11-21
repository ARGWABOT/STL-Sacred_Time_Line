// Los nombres en el idioma de la interfaz (pedido pd_nombres_dos_idiomas; nmwpswgnhtit, nmwpsunt6tit, nmwpsv4jytit,
// nmwptwwoetit, nmwptxjdntit): los nombres y lo que hace cada parte del proyecto (sus frentes), la meta con su línea de
// éxito, la lista de la meta y la línea de cada archivo clave se escriben solo en el idioma de la interfaz mientras no
// cambia, revisión tras revisión: ningún token va a un idioma que nadie usa. Cuando la persona cambia el idioma, la
// revisión siguiente agrega el otro, todo lo corto de una vez, y la bandeja se lo pide al director con la lista de lo que
// falta. Mientras falta, cada texto se muestra como se escribió, sin marca. Cuando la persona edita uno de esos textos en su
// idioma (la meta, en «Proyecto»), su traducción deja de valer y el director reescribe el otro idioma en la revisión
// siguiente. Las misiones y respuestas viejas quedan como se escribieron: son historia.
//
// Dónde vive el otro idioma: en `Plan.traducciones`, por clave (`frente:<id>:nombre`, `frente:<id>:que`, `meta:texto`,
// `meta:exito`, `criterio:<id>`, y lo que la persona contó en «Proyecto»: `inicio:contexto`, `inicio:meta`), con el texto en sus dos idiomas, `{ "es": "…", "en": "…" }`. Una traducción vale
// mientras uno de sus dos textos sea el que está escrito hoy en su sitio; si nadie la escribió aún, o el texto cambió, ese
// texto le falta al idioma de la interfaz. Lo que dicen los archivos clave sigue en su `para` (archivosClave.ts). Puro.

import type { Criterio, Frente, Objetivo, Plan } from './director.ts';
import type { Idioma } from './idioma.ts';
import { PALABRAS_EN, PALABRAS_ES } from './voz.ts';

/** Un texto corto en sus idiomas: el que se escribió y el que agregó el director. */
export type Traduccion = Partial<Record<Idioma, string>>;

/** Un texto corto del proyecto que se muestra en el idioma de la interfaz: su clave, dónde está (para la bandeja) y lo escrito. */
export interface TextoCorto {
  clave: string;
  donde: string;
  texto: string;
  /** Con qué saber su idioma, si él solo es muy corto (el nombre de una parte, con lo que hace). */
  contexto?: string;
}

/**
 * El idioma de un texto corto, por sus palabras comunes y sus tildes: el que más tiene; null si empatan o no trae
 * ninguna (un nombre propio). Pura.
 */
function idiomaCorto(texto: string): Idioma | null {
  let es = /[áéíóúñ¿¡]/i.test(texto) ? 1 : 0;
  let en = 0;
  for (const p of texto.toLowerCase().match(/\p{L}+/gu) ?? []) {
    if (PALABRAS_ES.has(p)) es++;
    else if (PALABRAS_EN.has(p)) en++;
  }
  return es > en ? 'es' : en > es ? 'en' : null;
}

const IDIOMAS: Idioma[] = ['es', 'en'];

/** Si una traducción todavía vale para ese texto: uno de sus idiomas dice exactamente lo que está escrito hoy. */
const vale = (t: Traduccion | undefined, texto: string) => !!t && IDIOMAS.some((i) => t[i] === texto);

/**
 * Un texto corto en el idioma de la interfaz: el de su traducción si todavía vale y lo trae; si no, como se escribió, sin
 * marca (nmwpsunt6tit). Pura.
 */
export function enSuIdioma(texto: string, t: Traduccion | undefined, idioma: Idioma): string {
  if (!texto) return texto;
  return vale(t, texto) && typeof t![idioma] === 'string' && t![idioma]!.trim() ? t![idioma]! : texto;
}

/** Los criterios de la lista de la meta, de la línea y de las fases que queden. */
function criteriosDe(plan: Plan): Criterio[] {
  const linea = (plan.linea as { meta?: { criterios?: Criterio[] } } | undefined)?.meta?.criterios ?? [];
  return [...linea, ...(plan.fases ?? []).flatMap((f) => f.criterios ?? [])];
}

/**
 * Lo que la persona contó del proyecto en «Proyecto»: «Qué es» y la meta que quiere lograr (nmwpvljattit: la meta salía en
 * español con la interfaz en inglés). Siguen la misma regla, con las claves `inicio:contexto` e `inicio:meta`.
 */
export interface Inicio {
  contexto?: string;
  metaInicial?: string;
}

/** Los textos cortos de un proyecto que siguen el idioma de la interfaz, con su clave. Pura. */
export function textosCortos(plan: Plan, objetivo?: Pick<Objetivo, 'texto' | 'exito'> | null, inicio?: Inicio | null): TextoCorto[] {
  const salida: TextoCorto[] = [];
  if (inicio?.contexto) salida.push({ clave: 'inicio:contexto', donde: '«What it is» in «Project»', texto: inicio.contexto });
  if (inicio?.metaInicial) salida.push({ clave: 'inicio:meta', donde: '«Your goal» in «Project»', texto: inicio.metaInicial });
  for (const f of plan.frentes ?? []) {
    if (f.nombre) salida.push({ clave: `frente:${f.id}:nombre`, donde: `part «${f.id}», its name`, texto: f.nombre, contexto: `${f.nombre} ${f.que ?? ''}` });
    if (f.que) salida.push({ clave: `frente:${f.id}:que`, donde: `part «${f.id}», what it does`, texto: f.que });
  }
  if (objetivo?.texto) salida.push({ clave: 'meta:texto', donde: 'the goal', texto: objetivo.texto });
  if (objetivo?.exito) salida.push({ clave: 'meta:exito', donde: "the goal's success line", texto: objetivo.exito });
  const vistos = new Set<string>();
  for (const c of criteriosDe(plan)) {
    if (!c?.id || !c.texto || vistos.has(c.id)) continue;
    vistos.add(c.id);
    salida.push({ clave: `criterio:${c.id}`, donde: `checklist item «${c.id}»`, texto: c.texto });
  }
  return salida;
}

/** Lo que le falta al idioma de la interfaz: un texto sin traducción en ese idioma, o con una que ya no vale porque cambió. */
export interface FaltaDeIdioma extends TextoCorto {
  /**
   * `falta`: nadie lo escribió en ese idioma; `rehacer`: la persona lo editó y su otro idioma ya no dice lo mismo;
   * `corregida`: la persona lo corrigió en «Proyecto» (`texto` es lo que escribió) y falta llevarlo al plan con su otro idioma.
   */
  motivo: 'falta' | 'rehacer' | 'corregida';
}

/**
 * Los textos cortos que no se leen en el idioma de la interfaz: los que no están escritos en él (según sus palabras; uno
 * que no lo dice, como un nombre propio, se pregunta) y no traen una traducción que valga, y los que la traían y la persona
 * los editó (su otro idioma, a reescribir: nmwpsv4jytit). Pura.
 */
export function textosSinSuIdioma(textos: TextoCorto[], traducciones: Record<string, Traduccion> | undefined, idioma: Idioma, correcciones?: Record<string, Traduccion>): FaltaDeIdioma[] {
  const salida: FaltaDeIdioma[] = [];
  for (const x of textos) {
    const t = traducciones?.[x.clave];
    // Lo que la persona corrigió en «Proyecto», en su idioma: hasta que el director lo lleve al plan con su otro idioma
    const c = correcciones?.[x.clave];
    const corregida = c && IDIOMAS.find((i) => typeof c[i] === 'string' && c[i]!.trim() && t?.[i] !== c[i] && x.texto !== c[i]);
    if (corregida) {
      salida.push({ ...x, texto: c![corregida]!, motivo: 'corregida' });
      continue;
    }
    if (t && !vale(t, x.texto)) {
      salida.push({ ...x, motivo: 'rehacer' });
      continue;
    }
    if (t && typeof t[idioma] === 'string' && t[idioma]!.trim()) continue;
    // Si no se sabe en qué idioma está (un nombre propio), se presume el de la interfaz: mientras no cambia, todo se
    // escribe en él, y no se gasta en traducir lo que no lo necesita
    const suyo = idiomaCorto(x.contexto ?? x.texto);
    if (!suyo || suyo === idioma) continue;
    salida.push({ ...x, motivo: 'falta' });
  }
  return salida;
}

/** Los archivos clave cuya línea no está en el idioma de la interfaz (la misma regla: nmwptwwoetit). Pura. */
function archivosClaveSinSuIdioma(plan: Plan, idioma: Idioma): string[] {
  return (plan.archivosClave ?? [])
    .filter((x) => {
      const p = x?.para as unknown;
      if (p && typeof p === 'object') return !((p as Traduccion)[idioma] ?? '').trim();
      const suyo = typeof p === 'string' ? idiomaCorto(p) : null;
      return !!suyo && suyo !== idioma;
    })
    .map((x) => x.ruta);
}

/**
 * Lo que la bandeja le pide al director cuando algo corto no se lee en el idioma de la interfaz: tras un cambio de idioma,
 * todo lo corto en esa revisión, de una vez (nmwptxjdntit), y lo que la persona editó, su otro idioma. Vacío si todo se lee
 * ya en ese idioma. Pura.
 */
export function lineasDeOtroIdioma(plan: Plan, objetivo: Pick<Objetivo, 'texto' | 'exito'> | null | undefined, idioma: Idioma, correcciones?: Record<string, Traduccion>, inicio?: Inicio | null): string[] {
  const faltan = textosSinSuIdioma(textosCortos(plan, objetivo, inicio), plan.traducciones, idioma, correcciones);
  const claves = archivosClaveSinSuIdioma(plan, idioma);
  if (!faltan.length && !claves.length) return [];
  const nombre = idioma === 'en' ? 'English' : 'Spanish';
  const lineas = [
    `## Short texts not in ${nombre} yet (${faltan.length + claves.length})`,
    `The interface is in ${nombre}: add ${nombre} to every short text below in this review, all in one go, and keep the language they were written in. Each goes in \`plan.traducciones\`, by its key, with both languages (\`{ "traducciones": { "<key>": { "es": "…", "en": "…" } } }\`): one of the two must be exactly what is written today, or it does not count. A text that reads the same in both (a proper name) gets the same text in both. The key files' lines go in their own \`para\`, with both languages. Old missions and answers stay as they are.`,
  ];
  const porMotivo = { falta: '', rehacer: ' (the person edited it: rewrite the other language)', corregida: ' (the person corrected it in «Project» to what follows: keep it as it is, write the other language, and put one of the two in its place in the plan)' };
  for (const x of faltan) lineas.push(`- [${x.clave}] ${x.donde}${porMotivo[x.motivo]}: «${x.texto.length > 160 ? `${x.texto.slice(0, 160)}…` : x.texto}»`);
  if (claves.length) lineas.push(`- Key files whose line has no ${nombre}: ${claves.join(', ')}`);
  return lineas;
}

/** Lo que no cumplen las traducciones que escribió el director (para `validarPlan`), un error por línea. Pura. */
export function erroresDeTraducciones(t: unknown): string[] {
  if (t === undefined) return [];
  if (!t || typeof t !== 'object' || Array.isArray(t)) return ['«traducciones» no es un objeto por clave.'];
  const errores: string[] = [];
  for (const [clave, v] of Object.entries(t as Record<string, unknown>)) {
    if (!/^(frente:[^:]+:(nombre|que)|meta:(texto|exito)|inicio:(contexto|meta)|criterio:.+)$/.test(clave)) errores.push(`La traducción «${clave}» no tiene una clave conocida (frente:<id>:nombre, frente:<id>:que, meta:texto, meta:exito, inicio:contexto, inicio:meta o criterio:<id>).`);
    const q = v as Record<string, unknown> | null;
    if (!q || typeof q !== 'object' || !IDIOMAS.every((i) => typeof q[i] === 'string' && !!(q[i] as string).trim())) errores.push(`La traducción «${clave}» va con sus dos idiomas: \`{ "es": "…", "en": "…" }\`.`);
  }
  return errores;
}

/** Un frente con su nombre y lo que hace en el idioma de la interfaz. Pura. */
const frenteEnSuIdioma =<F extends Frente>(f: F, t: Record<string, Traduccion> | undefined, idioma: Idioma): F => ({
  ...f,
  nombre: enSuIdioma(f.nombre, t?.[`frente:${f.id}:nombre`], idioma),
  que: enSuIdioma(f.que, t?.[`frente:${f.id}:que`], idioma),
});

/**
 * Lo que la interfaz muestra de un proyecto, en su idioma: los frentes, la meta y la lista de la meta con su traducción si
 * vale; lo demás, igual. Nunca cambia lo que se guarda (solo lo que se muestra), y devuelve objetos nuevos. Pura.
 */
export function planEnSuIdioma<P extends Plan>(plan: P, idioma: Idioma, correcciones?: Record<string, Traduccion>): P {
  const t = plan.traducciones ?? {};
  if (!Object.keys(t).length && !Object.keys(correcciones ?? {}).length) return plan;
  const crit = (c: Criterio) => ({ ...c, texto: enSuIdioma(c.texto, t[`criterio:${c.id}`], idioma) });
  const linea = plan.linea as (Plan['linea'] & { meta?: { criterios?: Criterio[] } }) | undefined;
  // Lo que la persona corrigió en su idioma se muestra antes que lo del director
  const corregido = (clave: string, x: string) => correcciones?.[clave]?.[idioma]?.trim() || x;
  return {
    ...plan,
    frentes: (plan.frentes ?? []).map((f) => {
      const g = frenteEnSuIdioma(f, t, idioma);
      return { ...g, nombre: corregido(`frente:${f.id}:nombre`, g.nombre), que: corregido(`frente:${f.id}:que`, g.que) };
    }),
    fases: (plan.fases ?? []).map((f) => ({ ...f, criterios: (f.criterios ?? []).map(crit) })),
    ...(linea?.meta?.criterios ? { linea: { ...linea, meta: { ...linea.meta, criterios: linea.meta.criterios.map(crit) } } } : {}),
  };
}

/**
 * Las correcciones de la persona con la de una parte: su nombre y lo que hace, en el idioma en que los escribió (el otro
 * idioma de esa parte, si lo había corregido antes, sale: ya no dice lo mismo, y lo reescribe el director). Pura.
 */
export function correccionDeParte(c: Record<string, Traduccion> | undefined, frente: string, idioma: Idioma, nombre: string, que: string): Record<string, Traduccion> {
  const salida = { ...(c ?? {}) };
  salida[`frente:${frente}:nombre`] = { [idioma]: nombre };
  if (que) salida[`frente:${frente}:que`] = { [idioma]: que };
  return salida;
}

/** «Qué es» y la meta que la persona contó, en el idioma de la interfaz, con su traducción si vale. Pura. */
export function inicioEnSuIdioma<I extends Inicio>(p: I, t: Record<string, Traduccion> | undefined, idioma: Idioma): I {
  return { ...p, contexto: enSuIdioma(p.contexto ?? '', t?.['inicio:contexto'], idioma), metaInicial: enSuIdioma(p.metaInicial ?? '', t?.['inicio:meta'], idioma) };
}

/** La meta en el idioma de la interfaz, con su traducción si vale. Pura. */
export function objetivoEnSuIdioma<O extends Pick<Objetivo, 'texto' | 'exito'>>(o: O, t: Record<string, Traduccion> | undefined, idioma: Idioma): O {
  return { ...o, texto: enSuIdioma(o.texto, t?.['meta:texto'], idioma), exito: enSuIdioma(o.exito, t?.['meta:exito'], idioma) };
}

/** Lo de un proyecto que sigue el idioma: su «Qué es», la meta que contó, su meta y lo corto del plan. */
export interface ProyectoConIdioma extends Inicio {
  objetivo?: Pick<Objetivo, 'texto' | 'exito'> | null;
  correcciones?: Record<string, Traduccion>;
}

/**
 * Todo lo que sigue el idioma de la interfaz, de una vez: lo corto del plan, la meta y «Qué es» y la meta que la persona
 * contó. Vale también sobre lo que ya se mostró en el otro idioma, porque una traducción vale mientras uno de sus dos
 * textos sea el de hoy: así cada cambio de ES a EN, y de vuelta, cambia los campos, no solo el primero (nmwpx3ru1tit: el
 * selector repintaba lo que ya estaba en el idioma anterior, y solo una carga que llegara después lo cambiaba). Pura.
 */
export function proyectoEnSuIdioma<P extends Plan, Q extends ProyectoConIdioma>(plan: P, proyecto: Q | null | undefined, idioma: Idioma): { plan: P; proyecto: Q | null | undefined } {
  const p = planEnSuIdioma(plan, idioma, proyecto?.correcciones);
  if (!proyecto) return { plan: p, proyecto };
  const conMeta = proyecto.objetivo ? { ...proyecto, objetivo: objetivoEnSuIdioma(proyecto.objetivo, p.traducciones, idioma) } : proyecto;
  return { plan: p, proyecto: inicioEnSuIdioma(conMeta, p.traducciones, idioma) };
}
