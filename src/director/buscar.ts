// Lo ya hecho, a una consulta (propuesta aceptada «Lo ya hecho, a una consulta», pr_memoria_consultable, punto 2): buscar
// por palabras en todo lo del proyecto (el plan unido con su archivo, lo respondido y los commits de su repositorio) y
// decir de cada hallazgo en qué estado está: hecho, de ahora o previsto, con su hilo. Lo que el director necesita saber no
// es qué se parece a lo que se pide, sino si ya se hizo, si está en curso o si está previsto. Sin base de datos ni nada
// que instalar: BM25 (la búsqueda léxica de los buscadores) sobre las raíces de las palabras en español. Pura: la
// herramienta (tools/director/buscar.ts) le da lo que lee.
import { aceptadasSinEjecutar, estadoMision, origenDePrevista, reemplazos, type EstadoDirector, type Plan } from './director.ts';

/** Los grupos de lo que se encuentra, en el orden en que se muestran. */
export const GRUPOS = ['hecho', 'ahora', 'previsto', 'respondido'] as const;
export type Grupo = (typeof GRUPOS)[number];
export const NOMBRE_GRUPO: Record<Grupo, string> = { hecho: 'Lo hecho o cerrado', ahora: 'Lo de ahora', previsto: 'Lo previsto', respondido: 'Lo respondido' };

/** Una cosa del proyecto donde se busca: su id, qué es, en qué grupo cae, su estado en palabras, su texto y su hilo. */
export interface Pieza {
  id: string;
  grupo: Grupo;
  /** Qué es y en qué estado está, en una frase corta («pedido por hacer · fase replicable»). */
  estado: string;
  titulo: string;
  texto: string;
  /** Lo que lo une a lo demás: las notas de donde sale, su commit, lo que lo reemplazó, dónde quedó. */
  hilo: string[];
}

export interface Hallazgo extends Pieza {
  puntaje: number;
  /** El pedazo del texto donde aparece lo buscado. */
  fragmento: string;
}

export interface CommitDelRepositorio {
  hash: string;
  cuando: string;
  asunto: string;
}

const PALABRAS_VACIAS = new Set(
  ('a al algo ante antes aqui asi cada como con contra cual cuando de del desde donde dos e el ella ellas ellos en entre era es esa esas ese eso esos ' +
    'esta estan estas este esto estos fue ha han hasta hay la las le les lo los mas me mi mis muy nada ni no nos o otra otras otro otros para pero ' +
    'poco por porque que quien se sea segun ser si sin sobre solo son su sus tambien te tiene tu tus un una uno unos unas va van y ya yo').split(' '),
);

/** Los finales que se quitan para llegar a la raíz, del más largo al más corto: plurales, género y las formas más comunes. */
const SUFIJOS = ['aciones', 'amientos', 'imientos', 'amiento', 'imiento', 'idades', 'acion', 'mente', 'ables', 'ibles', 'istas', 'idad', 'able', 'ible', 'ista', 'ados', 'adas', 'idos', 'idas', 'ado', 'ada', 'ido', 'ida', 'ar', 'er', 'ir', 'es', 'os', 'as', 's', 'a', 'o', 'e'];

/**
 * La raíz de una palabra ya sin tildes ni mayúsculas: «instalación», «instalar», «instalado» e «instalarlo» dan «instal».
 * El pronombre pegado al verbo («instalarlo», «pedírselo») sale antes.
 */
export function raizDe(palabra: string): string {
  const sinPronombre = palabra.length > 6 ? palabra.replace(/(ar|er|ir)(?:selos|selas|selo|sela|los|las|les|nos|lo|la|le|se|me|te)$/, '$1') : palabra;
  for (const s of SUFIJOS) if (sinPronombre.endsWith(s) && sinPronombre.length - s.length >= 4) return sinPronombre.slice(0, -s.length);
  return sinPronombre;
}

const normal = (texto: string) => texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** Las raíces de un texto, en orden y con repeticiones, sin las palabras vacías. Un id (pd_lo_vigente) es una sola palabra. */
export function raices(texto: string): string[] {
  return [...normal(texto).matchAll(/[\p{L}\p{N}_]+/gu)].map((m) => m[0]).filter((p) => p.length > 1 && !PALABRAS_VACIAS.has(p)).map(raizDe);
}

/** El pedazo de un texto alrededor de la primera palabra buscada, de unos 200 caracteres. */
function fragmentoDe(texto: string, buscadas: ReadonlySet<string>): string {
  const plano = texto.replace(/\s+/g, ' ').trim();
  for (const m of plano.matchAll(/[\p{L}\p{N}_]+/gu)) {
    if (!buscadas.has(raizDe(normal(m[0])))) continue;
    const desde = Math.max(0, m.index! - 80);
    const hasta = Math.min(plano.length, m.index! + 120);
    return `${desde > 0 ? '…' : ''}${plano.slice(desde, hasta).trim()}${hasta < plano.length ? '…' : ''}`;
  }
  return '';
}

const corto = (texto: string, n = 120) => { const t = texto.replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t; };
const dia = (iso?: string) => (iso ? iso.slice(0, 10) : '');

/**
 * Todo lo del proyecto donde se busca, cada cosa con su estado: las propuestas, los pedidos, las misiones, las misiones
 * previstas de cada fase, lo avanzado, lo adelantado, lo respondido a cada nota y los commits. `plan` es el unido con su
 * archivo, para que cuente lo cerrado.
 */
export function piezasDelProyecto(plan: Plan, estado: EstadoDirector, commits: readonly CommitDelRepositorio[] = []): Pieza[] {
  const fuera = reemplazos(plan);
  const piezas: Pieza[] = [];
  for (const p of plan.propuestas ?? []) {
    const r = estado.propuestas[p.id];
    const hecha = plan.ejecutadas?.[p.id];
    const por = fuera.get(p.id);
    const [grupo, como]: [Grupo, string] = hecha ? ['hecho', `propuesta ejecutada el ${dia(hecha.cuando)}`]
      : por ? ['hecho', `propuesta reemplazada por ${por}`]
      : r?.estado === 'aceptada' ? ['previsto', `propuesta aceptada sin ejecutar · fase ${p.fase}`]
      : r?.estado === 'descartada' ? ['hecho', `propuesta descartada el ${dia(r.fecha)}: no se hará`]
      : r ? ['previsto', `propuesta ${r.estado} · fase ${p.fase}`]
      : ['previsto', `propuesta por decidir · fase ${p.fase}`];
    piezas.push({ id: p.id, grupo, estado: como, titulo: p.titulo, texto: [p.problema, p.propuesta, p.conecta].join('\n'), hilo: [...(hecha ? [corto(hecha.nota)] : []), ...(p.reemplaza?.length ? [`reemplaza a ${p.reemplaza.join(', ')}`] : [])] });
  }
  for (const p of plan.pedidos ?? []) {
    const por = fuera.get(p.id);
    const [grupo, como]: [Grupo, string] = p.hecho ? ['hecho', `pedido hecho el ${dia(p.hecho.cuando)}`]
      : por ? ['hecho', `pedido reemplazado por ${por}`]
      : ['previsto', `pedido por hacer · ${p.fase === 'despues' ? 'después del lanzamiento' : `fase ${p.fase}`}`];
    piezas.push({ id: p.id, grupo, estado: como, titulo: corto(p.texto), texto: p.texto, hilo: [...(p.notas?.length ? [`notas ${p.notas.join(', ')}`] : []), ...(p.hecho ? [corto(p.hecho.nota)] : []), ...(p.reemplaza?.length ? [`reemplaza a ${p.reemplaza.join(', ')}`] : [])] });
  }
  for (const m of plan.misiones ?? []) {
    const e = estadoMision(m, plan, estado);
    const grupo: Grupo = e === 'aprobada' ? 'hecho' : e === 'bloqueada' ? 'previsto' : 'ahora';
    const pasos = m.pasos.map((x) => (typeof x === 'string' ? x : x.texto)).join('\n');
    const revision = plan.revisiones?.[m.id];
    piezas.push({ id: m.id, grupo, estado: `misión de ${m.para} · ${e.replace('_', ' ')}${revision?.veredicto === 'aprobada' ? ` el ${dia(revision.cuando)}` : ''}`, titulo: m.titulo, texto: [m.porQue, pasos, m.entrega].join('\n'), hilo: [...(m.origen?.length ? [`nace de ${m.origen.join(', ')}`] : []), ...(m.despuesDe?.length ? [`después de ${m.despuesDe.join(', ')}`] : [])] });
  }
  for (const f of plan.fases ?? []) {
    (f.misiones ?? []).forEach((texto, i) => {
      const origen = origenDePrevista(texto, plan, estado);
      const hecha = origen.ids.length > 0 && origen.hechos.length === origen.ids.length;
      piezas.push({ id: `${f.id}#${i + 1}`, grupo: hecha ? 'hecho' : 'previsto', estado: `misión prevista de la fase ${f.id}${hecha ? ', hecha' : ''}`, titulo: corto(texto), texto, hilo: origen.ids.length ? [`nombra ${origen.ids.join(', ')}`] : [] });
    });
  }
  (plan.resumen?.avanzamos ?? []).forEach((texto, i) => piezas.push({ id: `avanzamos#${i + 1}`, grupo: 'hecho', estado: `lo avanzado (${dia(plan.resumen?.fecha)})`, titulo: corto(texto), texto, hilo: [] }));
  (plan.adelantado ?? []).forEach((a, i) => piezas.push({ id: `adelantado#${i + 1}`, grupo: 'hecho', estado: `adelantado para la fase ${a.fase}`, titulo: corto(a.texto), texto: a.texto, hilo: [] }));
  const notas = new Map(estado.notas.map((n) => [n.id, n]));
  for (const [id, r] of Object.entries(plan.respuestas ?? {})) {
    const n = notas.get(id);
    const destino = r.destino ? [r.destino.etiqueta ?? r.destino.ancla ?? r.destino.doc ?? r.destino.fase ?? r.destino.vista].filter(Boolean).map((x) => `quedó en ${x}`) : [];
    piezas.push({ id, grupo: 'respondido', estado: `respuesta del ${dia(r.cuando)}${r.tratamiento ? ` · ${r.tratamiento}` : ''}`, titulo: corto(n?.texto ?? r.texto), texto: [n?.texto ?? '', r.texto].join('\n'), hilo: destino });
  }
  for (const c of commits) piezas.push({ id: c.hash, grupo: 'hecho', estado: `commit del ${dia(c.cuando)}`, titulo: corto(c.asunto), texto: c.asunto, hilo: [] });
  return piezas;
}

const K1 = 1.2;
const B = 0.75;

/**
 * Lo que se encuentra de una búsqueda, por BM25 sobre las raíces: en cada grupo, de lo más parecido a lo menos, y a lo
 * sumo `porGrupo` de cada uno. Una pieza que no trae ninguna de las palabras no sale. Sin palabras, nada.
 */
export function buscar(piezas: readonly Pieza[], consulta: string, porGrupo = 8): Hallazgo[] {
  const buscadas = new Set(raices(consulta));
  if (!buscadas.size) return [];
  const docs = piezas.map((p) => raices(`${p.titulo}\n${p.texto}`));
  const total = docs.length;
  const largoMedio = docs.reduce((s, d) => s + d.length, 0) / Math.max(1, total);
  const enCuantos = new Map<string, number>();
  for (const d of docs) for (const t of new Set(d)) if (buscadas.has(t)) enCuantos.set(t, (enCuantos.get(t) ?? 0) + 1);
  const hallazgos: Hallazgo[] = [];
  piezas.forEach((p, i) => {
    const d = docs[i];
    const veces = new Map<string, number>();
    for (const t of d) if (buscadas.has(t)) veces.set(t, (veces.get(t) ?? 0) + 1);
    let puntaje = 0;
    for (const [t, f] of veces) {
      const n = enCuantos.get(t) ?? 0;
      const idf = Math.log(1 + (total - n + 0.5) / (n + 0.5));
      puntaje += (idf * f * (K1 + 1)) / (f + K1 * (1 - B + (B * d.length) / largoMedio));
    }
    if (puntaje > 0) hallazgos.push({ ...p, puntaje, fragmento: fragmentoDe(p.texto, buscadas) });
  });
  return GRUPOS.flatMap((g) => hallazgos.filter((h) => h.grupo === g).sort((a, b) => b.puntaje - a.puntaje).slice(0, porGrupo));
}

/** Lo pendiente del plan, como piezas: las propuestas aceptadas sin ejecutar y los pedidos sin hacer, sin lo reemplazado. */
export function piezasPendientes(plan: Plan, estado: EstadoDirector): Pieza[] {
  const fuera = reemplazos(plan);
  const ids = new Set([
    ...aceptadasSinEjecutar(plan, estado).map((x) => x.propuesta.id),
    ...(plan.pedidos ?? []).filter((p) => !p.hecho && !fuera.has(p.id)).map((p) => p.id),
  ]);
  return piezasDelProyecto(plan, estado).filter((p) => ids.has(p.id));
}

/** Algo pendiente que un commit puede haber dejado hecho, con su evidencia: el commit que lo nombra por su id o que se le parece de verdad. */
export interface PuedeQueHecho {
  id: string;
  titulo: string;
  evidencia: { hash: string; asunto: string; como: 'lo nombra' | 'se le parece' }[];
}

/**
 * Desde cuánto se le parece un commit a algo pendiente: la parte de lo que dice (cada palabra pesada por lo rara que es)
 * que está en lo pendiente. Medido con los 149 commits de STL Studio del 24 al 27 de octubre de 2026 contra sus 74
 * pendientes: con 0,7 y 5 palabras salen cinco parecidos en tres días, tres de ellos de verdad emparentados.
 */
const PARECIDO_MIN = 0.7;
/** …y cuántas de sus palabras tienen que estar, por lo menos: un asunto de pocas palabras no basta. */
const COMUNES_MIN = 5;

const nombra = (texto: string, id: string) => new RegExp(`(^|[^\\w])${id.replace(/[^\w]/g, '\\$&')}(?![\\w])`).test(texto);

/**
 * Lo pendiente que puede que ya esté hecho (pr_memoria_consultable, punto 3): la bandeja cruza sola lo pendiente con los
 * commits desde la última revisión. Un commit que nombra un pendiente por su id es su evidencia; uno que no nombra
 * ninguno, solo del pendiente que más se le parece, y solo si se le parece de verdad (PARECIDO_MIN, COMUNES_MIN): una
 * palabra del commit que nada de lo pendiente dice pesa mucho, así que un commit de otra cosa no se le pega a nada.
 */
export function puedeQueYaEsteHecho(pendientes: readonly Pieza[], commits: readonly CommitDelRepositorio[], minimo = { parecido: PARECIDO_MIN, comunes: COMUNES_MIN }): PuedeQueHecho[] {
  if (!pendientes.length || !commits.length) return [];
  const docs = pendientes.map((p) => new Set(raices(`${p.titulo}\n${p.texto}`)));
  const idf = (t: string) => { const n = docs.filter((d) => d.has(t)).length; return Math.log(1 + (docs.length - n + 0.5) / (n + 0.5)); };
  const pistas = new Map<string, PuedeQueHecho>();
  const sumar = (p: Pieza, c: CommitDelRepositorio, como: PuedeQueHecho['evidencia'][number]['como']) => {
    const x = pistas.get(p.id) ?? { id: p.id, titulo: p.titulo, evidencia: [] };
    x.evidencia.push({ hash: c.hash, asunto: c.asunto, como });
    pistas.set(p.id, x);
  };
  for (const c of commits) {
    const nombrados = pendientes.filter((p) => nombra(c.asunto, p.id));
    for (const p of nombrados) sumar(p, c, 'lo nombra');
    if (nombrados.length) continue;
    const suyas = [...new Set(raices(c.asunto))];
    const peso = new Map(suyas.map((t) => [t, idf(t)]));
    const total = suyas.reduce((s, t) => s + peso.get(t)!, 0);
    if (!total) continue;
    let mejor = -1;
    let parecido = 0;
    let comunes = 0;
    docs.forEach((d, i) => {
      const estan = suyas.filter((t) => d.has(t));
      const p = estan.reduce((s, t) => s + peso.get(t)!, 0) / total;
      if (p > parecido) [mejor, parecido, comunes] = [i, p, estan.length];
    });
    if (mejor >= 0 && parecido >= minimo.parecido && comunes >= minimo.comunes) sumar(pendientes[mejor], c, 'se le parece');
  }
  return [...pistas.values()];
}

/**
 * Las pistas que el director no atendió: siguen pendientes (las hechas ya no salen de `piezasPendientes`) y su id no está
 * en lo que dejó dicho en `alDia` en esta revisión (desde `desde`). Sin atenderlas, --listo no cierra.
 */
export function pistasSinAtender(pistas: readonly PuedeQueHecho[], alDia: Plan['alDia'], desde: string): PuedeQueHecho[] {
  const nota = alDia && alDia.cuando >= desde ? alDia.nota : '';
  return pistas.filter((x) => !nombra(nota, x.id));
}
