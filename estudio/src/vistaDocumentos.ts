// La vista «Documentos»: la columna de lectura de quien mira (su misión de ahora, lo que viene después y lo ya leído, y
// «Documentación del proyecto») y, al lado, el documento abierto, parte por parte. Salió de app.ts al partir los
// módulos grandes (propuesta aceptada pr_partir_modulos), como el Buzón (vistaBuzon.ts): recibe lo que pinta y no guarda
// nada; lo que recuerda la columna entre un repintado y otro (qué había dentro de cada parte plegable, si hay que llevarla
// hasta el documento abierto) y todo lo que se pinta igual en el resto del Studio (la tarjeta de cada nota, el cuerpo de
// cada parte leída idea por idea, los ajustes del lector) lo da la página.
import {
  partesDeDocumento,
  textoPlano,
  type DocumentoEnRuta,
  type DocumentoRevisar,
  type EstadoLectura,
  type Lugar,
  type Nota,
  type Persona,
} from '../../src/director/director';
import type { ArchivoClave } from '../../src/director/archivosClave';
import { icono } from './iconos';
import { instruccionDeAgente } from './listas';
import { conAyuda } from './palabras';
import { t } from './textos';
import { esc } from './util';

/** Un documento que el servidor lista. `studio`: es del propio Studio (su método, su diseño), no del proyecto. */
export interface Documento { ruta: string; titulo: string; studio?: boolean }

/** Una parte de un documento: lo que sigue a un `##` (la primera, sin título, es la entrada). */
export interface Seccion { titulo: string; md: string }

/** Lo que pinta la vista. La página se lo da con sus datos y con lo que depende de ella, ya pintado. */
export interface DatosDocumentos {
  /** El rol de quien mira (nadie, si todavía no tiene) y la persona cuya lectura se ve (con el filtro «Ver como», otra). */
  yo: Persona | null;
  persona: Persona;
  /** El nombre de esa persona, como se le dice. */
  nombreDePersona: string;
  /** Los documentos que el director curó para consultar, y los archivos clave que eligió para el proyecto. */
  curados: DocumentoRevisar[];
  archivosClave: ArchivoClave[];
  /** La lectura de esa persona, en el orden de sus misiones: el que sigue, los que vienen después, los ya leídos. */
  enRuta: (DocumentoEnRuta & { lectura: EstadoLectura })[];
  /** Los documentos que el servidor lista (nada, mientras no se han pedido todos), cuántos .md del repositorio no caben en la lista y si el repositorio está conectado. */
  documentos: Documento[] | null;
  documentosFuera: number;
  repositorioConectado: boolean;
  /** El documento abierto (nada, si no hay ninguno) y todas las notas, de las que aquí se ven las que lo comentan. */
  doc: { ruta: string; texto: string } | null;
  notas: Nota[];
  /** Si la columna está plegada (es de este navegador). */
  listaPlegada: boolean;
  /** Empieza el pintado de la columna: la página mira si el documento abierto es nuevo y recuerda cuál es. */
  alEmpezarColumna: () => void;
  /**
   * El atributo de una parte plegable de la columna: la página recuerda si quien mira la abrió y qué documento tenía
   * dentro, y se abre sola si le llega el documento abierto. `rutas`: los documentos que caben en ella.
   */
  plegableEnColumna: (clave: string, rutas: string[], abiertaAlNacer?: boolean) => string;
  /** El atributo de un plegable que recuerda si quien mira lo abrió. */
  plegable: (clave: string) => string;
  /** El título de un documento, por su ruta. */
  tituloDoc: (ruta: string) => string;
  /**
   * Si lo abierto se abrió con su botón de «Archivos clave»: un archivo clave que también está en otra parte de la columna
   * se marca solo en la copia que recibió el clic (nmw2db9dptit). Sin él, se marca la otra.
   */
  copiaEnClave?: boolean;
  /** Las partes de un documento que quien mira ya leyó, y si una de ellas se reabrió porque el director reescribió una idea. */
  leidasDe: (ruta: string) => string[];
  reabierta: (ruta: string, s: Seccion) => boolean;
  /** Lo que falta para dar por leída una parte que se lee de a una idea. */
  faltaEnParte: (ruta: string, s: Seccion) => { total: number; hechas: number; decisiones: number };
  /** El cuerpo de una parte: leída idea por idea (con las notas de esa parte) o entera, con sus decisiones (las notas de cada una). */
  porTrozos: (s: Seccion, notas: Nota[]) => string;
  conDecisiones: (titulo: string, md: string, notas: Nota[]) => string;
  /** La parte de un documento como lugar, y una nota pintada por la página como en el resto del Studio. */
  enParte: (ruta: string, seccion: string) => Lugar;
  tarjetaNota: (n: Nota, conSobre: boolean, plegada: boolean, enRespuesta: boolean, aqui: Lugar) => string;
  /** El botón de volver a la misión, los ajustes del lector (letra, tamaño) y la clase de su letra. */
  volverAMisionDe: (ruta: string | null) => string;
  ajustesLector: (ruta: string) => string;
  claseLector: () => string;
}

/** Las partes de un documento: la entrada y cada `##` (por su título, sin formato; lo que está en un bloque de código no cuenta). */
export function secciones(texto: string): Seccion[] {
  const salida: Seccion[] = [{ titulo: '', md: '' }];
  let enCodigo = false;
  for (const linea of texto.split(/\r?\n/)) {
    if (/^```/.test(linea)) enCodigo = !enCodigo;
    const h2 = !enCodigo && /^##\s+(.+)$/.exec(linea);
    if (h2) salida.push({ titulo: textoPlano(h2[1]), md: linea + '\n' });
    else salida[salida.length - 1].md += linea + '\n';
  }
  return salida.filter((s) => s.titulo || s.md.trim());
}

/**
 * La única parte de un documento sin `##` (AGENTS.md), por leer, en la misma caja con que la pinta vistaDocumentos: así
 * app.ts › primeraParteDe prepara su voz antes de abrirlo, con sus párrafos juntos en los mismos bloques grandes.
 */
export const parteEntera = (cuerpo: string) => `<section class="parte-doc por-leer entrada-doc" data-parte="">${cuerpo}</section>`;

const ETIQUETA_DOC = { siguiente: 'docs.sigueEste', despues: 'docs.despues', leido: 'docs.leido', revisado: 'docs.revisado' } as const;

export function vistaDocumentos(datos: DatosDocumentos) {
  const { curados, doc, enRuta, persona, plegable, plegableEnColumna, tituloDoc, tarjetaNota, enParte, leidasDe, reabierta, volverAMisionDe } = datos;
  const propia = persona === datos.yo;
  // Mientras haya algo por leer, lo demás queda plegado: la columna lleva al documento que sigue
  const leyendo = propia && enRuta.some((x) => x.lectura === 'siguiente');
  // Los documentos del propio Studio (su método, su diseño) no van entre los del proyecto
  const esDelStudio = (ruta: string) => ruta.startsWith('docs/metodo/') || (datos.documentos ?? []).some((x) => x.ruta === ruta && x.studio);
  const banco = curados.filter((c) => !enRuta.some((x) => x.ruta === c.ruta) && !esDelStudio(c.ruta));
  const otros = (datos.documentos ?? []).filter((x) => !curados.some((c) => c.ruta === x.ruta) && !enRuta.some((y) => y.ruta === x.ruta) && !esDelStudio(x.ruta));
  const delProyecto = otros.filter((x) => !x.ruta.startsWith('repo:'));
  // Del repositorio, la documentación por un lado y, aparte y plegadas, las instrucciones para los agentes de IA
  // (CLAUDE.md, AGENTS.md y los comandos de Claude Code y de Codex), con un nombre que se entienda
  const instrucciones = otros.flatMap((x) => {
    const nombre = instruccionDeAgente(x.ruta, x.titulo);
    return nombre ? [{ ...x, titulo: nombre }] : [];
  });
  const delRepo = otros.filter((x) => x.ruta.startsWith('repo:') && !instrucciones.some((y) => y.ruta === x.ruta));
  const porQue = (ruta: string) => curados.find((c) => c.ruta === ruta)?.porQue ?? '';
  // Ninguna parte plegable de la columna se pliega sola, ni al abrir un documento ni al repintarse: queda como la dejaste.
  // La que recibe el documento abierto (lo acabas de abrir, o pasó a ella al leerlo) se abre, para que lo veas marcado en
  // ella (nota del titular, 22 de octubre): eso lo lleva la página, que recuerda lo que la columna mostró la última vez
  datos.alEmpezarColumna();
  // Al pasar el ratón, qué es: su título y, si es del repositorio, dónde está
  const queEs = (x: Documento) => (x.ruta.startsWith('repo:') ? t('docs.delRepoQue', { que: x.titulo.includes(' · ') ? x.titulo : `${x.titulo} · ${x.ruta.slice(5)}` }) : x.titulo);
  // Los archivos clave del proyecto, los que eligió el director (plan.archivosClave): un botón por archivo, con el nombre a la
  // vista y, al pasar el ratón, lo que es (su «para»). Los .md se leen como cualquier documento; el resto, como texto
  const claves = datos.archivosClave;
  // Un archivo clave que también es documentación (el README) sale dos veces en la columna. Solo se marca la copia en la
  // que diste clic: la otra no, porque la columna se llevaba a la vista la primera marcada y saltaba (nota de voz del
  // titular nmw2db9dptit, 4 de noviembre de 2026; la regresión nació con los archivos clave en la columna)
  const enOtraParte = (ruta: string) => [...enRuta, ...banco, ...(datos.documentos ? [...delProyecto, ...delRepo, ...instrucciones] : [])].some((x) => x.ruta === ruta);
  const enClave = (ruta: string) =>claves.some((c) => `repo:${c.ruta}` === ruta);
  const marcaLaClave = (ruta: string) => doc?.ruta === ruta && (datos.copiaEnClave === true || !enOtraParte(ruta));
  const marca = (ruta: string) => doc?.ruta === ruta && !(datos.copiaEnClave === true && enClave(ruta));
  const boton = (x: Documento) => `<button type="button" class="doc-l chico${marca(x.ruta) ? ' sel' : ''}" data-doc="${esc(x.ruta)}" title="${esc(queEs(x))}">${esc(x.titulo)}</button>`;
  const nombreClave = (ruta: string) => (claves.filter((c) => c.ruta.split('/').pop() === ruta.split('/').pop()).length > 1 ? ruta : (ruta.split('/').pop() ?? ruta));
  const archivosClave = claves.length
    ? `<div class="archivos-clave" data-ancla="d-clave"><h3>${t('docs.archivosClave')}</h3>${claves.map((c) => `<button type="button" class="doc-l chico${marcaLaClave(`repo:${c.ruta}`) ? ' sel' : ''}" data-doc="${esc(`repo:${c.ruta}`)}" title="${esc(c.para)}"><b>${esc(nombreClave(c.ruta))}</b></button>`).join('')}</div>`
    : '';
  // Lo que el servidor dejó fuera de la lista del repositorio (MAX_DOCS_REPO): se dice, no se calla
  const { documentosFuera } = datos;
  const avisoFuera = documentosFuera > 0 ? `<p class="intro">${t('docs.fuera', { n: documentosFuera })}</p>` : '';
  let n = 0;
  const tarjeta = (x: (typeof enRuta)[number]) => {
    // Lo que viene después se ve, pero se abre al terminar el que sigue
    const cerrado = propia && x.lectura === 'despues';
    const lectura = propia ? x.lectura : x.estado === 'pendiente' ? 'despues' : x.estado;
    return `<button type="button" class="doc-l ${lectura}${marca(x.ruta) ? ' sel' : ''}" data-doc="${esc(x.ruta)}"${cerrado ? ` disabled aria-disabled="true" title="${esc(t('docs.seAbreAlTerminar'))}"` : ''}>
      <span class="fila-doc"><span class="num-doc">${x.estado === 'revisado' || lectura === 'leido' ? '✓' : ++n}</span><b>${esc(tituloDoc(x.ruta))}</b></span>
      <span class="chip estado-doc ${lectura}">${cerrado ? t('docs.despuesAbre') : t(ETIQUETA_DOC[lectura])}</span>
      <small>${esc(porQue(x.ruta))} ${t('docs.mision', { titulo: esc(x.mision.titulo) })}</small></button>`;
  };
  // Mientras lees, la columna muestra entero solo el que sigue: lo de después y lo ya leído, plegado en una línea
  // cada uno, para que la atención se quede en lo que toca ahora
  // Lo que la página recuerda va con su clave de siempre, en cualquier idioma
  const plegado = (cual: 'despues' | 'leidos', xs: typeof enRuta, abiertaAlNacer = false) => xs.length
    ? `<details class="docs-plegados" data-ancla="${cual === 'despues' ? 'd-despues' : 'd-leidos'}"${plegableEnColumna(`columna|${cual === 'despues' ? 'Después' : 'Ya leídos'}`, xs.map((x) => x.ruta), abiertaAlNacer)}><summary>${t(cual === 'despues' ? 'docs.despues' : 'docs.yaLeidos')} <span class="cifra">${xs.length}</span>${cual === 'leidos' ? conAyuda('sello') : ''}</summary>${xs.map((x) => `<button type="button" class="doc-l chico ${x.lectura}${marca(x.ruta) ? ' sel' : ''}" data-doc="${esc(x.ruta)}"${x.lectura === 'despues' ? ` disabled aria-disabled="true" title="${esc(t('docs.seAbreAlTerminar'))}"` : ` title="${esc(tituloDoc(x.ruta))}"`}><b>${esc(tituloDoc(x.ruta))}</b></button>`).join('')}</details>`
    : '';
  // Lo de después y lo ya leído, siempre en su parte plegable: plegadas mientras hay algo por leer, abiertas al nacer si no
  const ordenLectura = !enRuta.length ? `<p class="intro">${t('docs.sinDocumentos')}</p>`
    : propia ? `${enRuta.filter((x) => x.lectura === 'siguiente').map(tarjeta).join('')}${plegado('despues', enRuta.filter((x) => x.lectura === 'despues'), !leyendo)}${plegado('leidos', enRuta.filter((x) => x.lectura === 'leido' || x.lectura === 'revisado'), !leyendo)}`
    : enRuta.map(tarjeta).join('');
  // Solo los documentos del proyecto: los del Studio (su método, su diseño) no se mezclan con ellos
  const lista = `<aside class="lista-docs" id="lista-docs">
      <div class="cabeza-lista"><h3>${t(leyendo ? 'docs.tuMision' : 'docs.tuOrden')} <small>· ${esc(datos.nombreDePersona)}</small></h3>
        <button type="button" class="plegar-lista" data-plegar-lista aria-controls="lista-docs" title="${esc(t('docs.plegar'))}" aria-label="${esc(t('docs.plegarNombre'))}">${icono('plegar')}</button></div>
      ${ordenLectura}
      <details class="otros-docs" data-ancla="d-otros"${plegableEnColumna('columna|otros', [...[...banco, ...otros].map((x) => x.ruta), ...claves.map((c) => `repo:${c.ruta}`)], !leyendo)}><summary>${t('docs.documentacion')}</summary>
      ${banco.length ? `<h3>${t('docs.paraConsultar')}</h3>${banco.map((c) => `<button type="button" class="doc-l chico${marca(c.ruta) ? ' sel' : ''}" data-doc="${esc(c.ruta)}" title="${esc(c.porQue || c.titulo)}"><b>${esc(c.titulo)}</b><small>${esc(c.porQue)}</small></button>`).join('')}` : ''}
      ${archivosClave}
      ${datos.documentos ? `${delProyecto.length ? `<h3>${t('docs.delProyecto')}</h3>${delProyecto.map(boton).join('')}` : ''}<h3>${t('docs.delRepo')}</h3>${delRepo.map(boton).join('')}${avisoFuera}${delRepo.length ? '' : `<p class="intro">${t(datos.repositorioConectado ? (instrucciones.length ? 'docs.repoSinMas' : 'docs.repoSinMd') : 'docs.repoSinConectar')}</p>`}${instrucciones.length ? `<details class="instrucciones-agentes" data-ancla="d-agentes"${plegableEnColumna('columna|instrucciones', instrucciones.map((x) => x.ruta))}><summary>${t('docs.instrucciones')} <span class="cifra">${instrucciones.length}</span></summary>${instrucciones.map(boton).join('')}</details>` : ''}` : `<button type="button" data-cargar-docs>${t('docs.verTodos')}</button>`}
      </details>
    </aside>
    <button type="button" class="desplegar-lista" data-plegar-lista aria-controls="lista-docs" title="${esc(t('docs.verColumna'))}" aria-label="${esc(t('docs.verColumna'))}">${icono('desplegar')}</button>`;
  if (!doc) return `<div class="docs">${lista}<div class="lector"><p class="intro">${t('docs.elige')}</p></div>${volverAMisionDe(null)}</div>`;
  const ruta = doc.ruta;
  const notas = datos.notas.filter((x) => x.sobre.tipo === 'documento' && x.sobre.id === ruta);
  const paraLeer = new Set(partesDeDocumento(doc.texto));
  const leidas = new Set(leidasDe(ruta));
  const parte = (s: Seccion) => {
    // Una parte leída en la que el director reescribió una idea se vuelve a abrir, solo en esa idea
    const leida = leidas.has(s.titulo) && !reabierta(ruta, s);
    const seLee = !!datos.yo && paraLeer.has(s.titulo);
    // Lo que falta por leer se lee de a una idea: cada párrafo o punto se marca «Entendido» y cada decisión se responde
    const porIdeas = seLee && !leida && !!s.titulo;
    // Leída de a una idea, lo comentado de cada idea va debajo de ella; ya leída (entera, sin ideas), va al pie de la
    // parte con lo demás, con su respuesta y su «Quedó aquí»: antes no se veía en ninguna parte (el titular no vio la
    // respuesta a su comentario sobre una idea de una parte ya leída, 22 de octubre de 2026)
    const deEsta = notas.filter((x) => (x.sobre.seccion ?? '') === s.titulo && !x.sobre.decision && (!x.sobre.fragmento || !porIdeas));
    const falta = porIdeas ? datos.faltaEnParte(ruta, s) : null;
    // La entrada (el título y quién lo escribió) no se marca ni se comenta: no hay nada que leer ahí. Leída de a una
    // idea, se comenta cada idea (debajo de ella, junto a su «Entendido»), no la parte entera: un solo botón, sin dudas
    // sobre qué se comenta
    const botones = s.titulo || seLee;
    // Una parte sin ideas que marcar se marca entera con su estrella; con ideas, se marca sola al atenderlas todas
    const marcar = !seLee ? ''
      : falta && falta.total > 0 ? `<span class="progreso-parte" title="${esc(t('docs.progresoTitulo'))}">${icono('estrella')} ${t('docs.progreso', { hechas: falta.hechas, total: falta.total })}${falta.decisiones ? ` · ${t('docs.faltaDecision', { n: falta.decisiones })}` : ''}</span>`
      : `<button type="button" class="leido-parte${leida ? ' hecho' : ''}" data-leido-parte="${esc(s.titulo)}" aria-pressed="${leida}" title="${esc(t(leida ? 'docs.quitarMarcaParte' : 'docs.marcarParte'))}">${icono('estrella')} ${t(leida ? 'docs.leida' : 'docs.leidaMarcar')}</button>`;
    const cuerpo = porIdeas ? datos.porTrozos(s, notas) : datos.conDecisiones(s.titulo, s.md, notas.filter((x) => (x.sobre.seccion ?? '') === s.titulo && x.sobre.decision));
    return `<section class="parte-doc${leida ? ' leida' : seLee ? ' por-leer' : ''}${s.titulo ? '' : ' entrada-doc'}" data-parte="${esc(s.titulo)}">
      ${cuerpo}
      ${deEsta.length || botones ? `<div class="comentar-parte">
        ${deEsta.length ? `<ul class="notas-lista">${deEsta.map((x) => tarjetaNota(x, false, false, false, enParte(ruta, s.titulo))).join('')}</ul>` : ''}
        ${botones ? `<div class="botones-parte">${porIdeas ? '' : `<button type="button" class="al-director" data-comentar="documento|${esc(ruta)}|${esc(s.titulo)}">${t(s.titulo ? 'docs.comentarParte' : 'docs.comentarDocumento')}</button>`}${marcar}</div>` : ''}
      </div>` : ''}
    </section>`;
  };
  // Lo ya leído baja al final, a «Ya leído» (plegado): arriba queda solo lo que falta, en su orden. Y se lee parte por
  // parte: la que sigue se abre al terminar la de ahora, para no saltarse nada ni decidir sobre lo que no se ha leído
  const todas = secciones(doc.texto);
  const yaLeidas = todas.filter((s) => datos.yo && paraLeer.has(s.titulo) && leidas.has(s.titulo) && !reabierta(ruta, s));
  const arriba = todas.filter((s) => !yaLeidas.includes(s));
  const ahora = arriba.find((s) => datos.yo && s.titulo && paraLeer.has(s.titulo));
  const cerrada = (s: { titulo: string }) => `<section class="parte-doc cerrada" data-parte="${esc(s.titulo)}">
      <h2>${esc(s.titulo)}</h2>
      <p class="como">${icono('candado')} ${t('docs.seAbreParte', { titulo: esc(ahora!.titulo) })}</p>
    </section>`;
  // Plegado, lo leído parecía un documento vacío: el rótulo dice que está ahí y cómo releerlo (nota de voz del titular,
  // 22 de octubre de 2026)
  const nLeidas = yaLeidas.length;
  const ayudaDeLeidas = t('docs.ayudaLeido', { n: nLeidas });
  const ayudaLeido = ahora ? ayudaDeLeidas : t('docs.leisteTodo', { resto: ayudaDeLeidas });
  const partes = `${arriba.map((s) => (ahora && s !== ahora && s.titulo && paraLeer.has(s.titulo) && arriba.indexOf(s) > arriba.indexOf(ahora) ? cerrada(s) : parte(s))).join('')}${nLeidas ? `<details class="ya-leido-doc"${plegable(`leido|${ruta}|${nLeidas}`)}><summary>${icono('estrella')} ${t('docs.yaLeido')} <span class="cifra">${nLeidas}</span> <span class="ayuda-leido">${ayudaLeido}</span></summary>${yaLeidas.map(parte).join('')}</details>` : ''}`;
  return `<div class="docs${datos.listaPlegada ? ' sin-lista' : ''}">${lista}<article class="lector ${datos.claseLector()}">${datos.ajustesLector(ruta)}${partes}</article>${volverAMisionDe(ruta)}</div>`;
}
