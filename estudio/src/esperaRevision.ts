// La pantalla de espera del inicio guiado (pedido pd_inicio_guiado): mientras corre la revisión que pidió al entregar un
// proyecto (su diagnóstico) o al confirmar la meta (su ruta), y al terminar lleva a lo siguiente: tras el diagnóstico, a
// elegir la meta; tras la ruta, a la primera misión, que es una lectura corta del diagnóstico (nmwajh5katit; route.md ›
// «The first mission»). La espera del diagnóstico bloquea y aprovecha ese rato para enseñar el Studio con 20 consejos
// ilustrados que pasan solos y se recorren con ‹ › (nota nmwb8rwsntit, pedido pd_consejos_espera, que reemplaza la ventana
// que se podía cerrar de nmwaji43utit); la de la ruta sigue diciendo sus etapas y se cierra cuando se quiere. Pura: la
// página la pinta (app.ts › mostrarEsperaRevision).
import type { RevisionPedida } from '../../src/director/proyectos';
import { htmlParadas, paradaDeEspera } from './paradasEntrega';
import { t } from './textos';
import { esc } from './util';

/** Qué revisión se espera: el diagnóstico de un proyecto recién entregado o la ruta de la meta recién confirmada. */
export type EsperaDe = 'diagnostico' | 'ruta';
/**
 * Dónde va: aún esperando su turno o trabajando, cerrada con el director terminando lo último («cerrando»: la página aún
 * no trae lo que escribió), ya cerrada y a la vista, o detenida sin cerrar.
 */
export type MomentoEspera = 'trabajando' | 'cerrando' | 'lista' | 'fallo';

/** Las etapas que nombra cada espera, en orden (sus textos, en textos/es.ts y textos/en.ts › espera.*). */
export const ETAPAS_ESPERA: Record<EsperaDe, readonly string[]> = {
  diagnostico: ['espera.diagnostico.leer', 'espera.diagnostico.memoria', 'espera.diagnostico.escribir', 'espera.diagnostico.metas'],
  ruta: ['espera.ruta.meta', 'espera.ruta.fases', 'espera.ruta.misiones', 'espera.ruta.lectura'],
};
/**
 * Un proyecto que aún no existe no se diagnostica: el director escribe su planteamiento (approach.md). Su espera habla del
 * planteamiento en el título, en sus etapas y en la línea de espera, nunca de «diagnosticar» (pd_entrega_fluida, nmwdxuaavtit).
 */
const ETAPAS_PLANTEAMIENTO: readonly string[] = ['espera.planteamiento.leer', 'espera.planteamiento.escribir', 'espera.diagnostico.metas'];
/** La clave de un texto de la espera: la del planteamiento si el proyecto es nuevo y se espera su primera revisión. Pura. */
function textoDeEspera(de: EsperaDe, parte: 'titulo' | 'lista', nuevo: boolean): string {
  return de === 'diagnostico' && nuevo ? `espera.planteamiento.${parte}` : `espera.${de}.${parte}`;
}

/** Cada cuánto pasa solo al consejo siguiente: despacio, para leerlo con calma. */
export const MS_POR_CONSEJO = 14_000;

// ── Los dibujos: pequeños, sin letras (valen en los dos idiomas), con los colores de docs/metodo/dibujos.md: amarillo la
// persona, gris el código del Studio y verde aguamarina (el acento) el modelo, siempre con las variables del Studio (siguen el tema)
const PERSONA = 'fill:var(--sobre,#fffdf5);stroke:var(--sobre-borde,#ecdcae)';
const STUDIO = 'fill:var(--panel-suave,#fbfaf7);stroke:var(--borde-fuerte,#cdc8bc)';
const MODELO = 'fill:var(--acento-fondo,#e3f5f0);stroke:var(--acento,#0d7f6b)';
const TRAZO = 'stroke:var(--suave,#5c5b55);fill:none';
const TINTA = 'fill:var(--suave,#5c5b55)';
const ACENTO = 'fill:var(--acento,#0d7f6b)';
const caja = (x: number, y: number, w: number, h: number, estilo: string, rx = 8, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" style="${estilo}"${extra}/>`;
const raya = (x1: number, y1: number, x2: number, y2: number, extra = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="2" stroke-linecap="round" style="${TRAZO}"${extra}/>`;
const circulo = (cx: number, cy: number, r: number, estilo: string, extra = '') => `<circle cx="${cx}" cy="${cy}" r="${r}" style="${estilo}"${extra}/>`;
const camino = (d: string, estilo = TRAZO, extra = '') => `<path d="${d}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="${estilo}"${extra}/>`;
/** Unas líneas de texto, como barras grises. */
const renglones = (x: number, y: number, anchos: number[], extra = '') => anchos.map((w, i) => caja(x, y + i * 9, w, 4, 'fill:var(--borde-fuerte,#cdc8bc)', 2, extra)).join('');
const visto = (x: number, y: number) => camino(`M${x},${y} l4,4 l8,-9`, 'stroke:var(--ok,#2e7d4f);fill:none');
const flecha = (x1: number, y: number, x2: number) => `${raya(x1, y, x2 - 2, y)}${camino(`M${x2 - 7},${y - 5} L${x2},${y} L${x2 - 7},${y + 5}`)}`;
/** Una carita, como las de la línea del proyecto. */
const cara = (cx: number, cy: number, r: number, estilo: string) => `${circulo(cx, cy, r, estilo)}${circulo(cx - r / 3, cy - r / 5, 1.3, TINTA)}${circulo(cx + r / 3, cy - r / 5, 1.3, TINTA)}${camino(`M${cx - r / 3},${cy + r / 4} Q${cx},${cy + r / 1.8} ${cx + r / 3},${cy + r / 4}`)}`;

/** Los 20 consejos, en el orden en que se leen: su clave (sus textos, en espera.consejo.<clave>.*) y su dibujo. */
export const CONSEJOS_ESPERA: readonly { clave: string; dibujo: string }[] = [
  // Una misión a la vez: la de ahora entera, las demás plegadas detrás
  { clave: 'mision', dibujo: `${caja(40, 6, 64, 50, STUDIO, 8, ' opacity=".45"')}${caja(32, 12, 64, 52, STUDIO, 8, ' opacity=".7"')}${caja(22, 18, 66, 52, PERSONA)}${renglones(32, 30, [44, 36, 40])}${visto(32, 58)}` },
  // Paso a paso: el hecho, el de ahora con su botón y el que espera
  { clave: 'pasos', dibujo: `${caja(14, 8, 92, 16, STUDIO, 6)}${visto(20, 16)}${renglones(40, 14, [52])}${caja(14, 30, 92, 18, PERSONA, 6)}${renglones(22, 37, [38])}${caja(68, 34, 30, 10, MODELO, 5)}${caja(14, 54, 92, 14, STUDIO, 6, ' opacity=".4"')}` },
  // «Volver a tu misión», abajo al centro
  { clave: 'volver', dibujo: `${caja(10, 6, 100, 62, STUDIO, 8)}${renglones(20, 16, [60, 70, 50])}${caja(34, 50, 52, 12, MODELO, 6)}${camino('M46,56 h-6 m3,-3 l-3,3 l3,3', 'stroke:var(--acento,#0d7f6b);fill:none')}${caja(52, 54.5, 26, 3, ACENTO, 1.5)}` },
  // «Hazlo tú»: la persona lo encarga y el director lo hace
  { clave: 'hazlo', dibujo: `${caja(8, 20, 34, 34, PERSONA, 8)}${cara(25, 37, 9, PERSONA)}${flecha(46, 37, 72)}${caja(76, 20, 36, 34, MODELO, 8)}${camino('M86,38 l6,6 l12,-13', 'stroke:var(--acento,#0d7f6b);fill:none')}` },
  // «No lo entiendo»: un paso con su pregunta, que vuelve explicado
  { clave: 'aclarar', dibujo: `${caja(10, 14, 64, 44, PERSONA, 8)}${renglones(20, 24, [44, 36, 40])}${circulo(88, 22, 13, MODELO)}<text x="88" y="27.5" text-anchor="middle" font-size="16" font-weight="700" style="${ACENTO}">?</text>${raya(78, 46, 92, 46)}${raya(78, 54, 102, 54)}` },
  // El Buzón: la burbuja del comentario cae en su bandeja
  { clave: 'buzon', dibujo: `${camino('M18,10 h44 a6,6 0 0 1 6,6 v18 a6,6 0 0 1 -6,6 h-30 l-10,8 v-8 h-4 a6,6 0 0 1 -6,-6 v-18 a6,6 0 0 1 6,-6 z', PERSONA)}${renglones(22, 20, [36, 26])}${camino('M70,40 C82,44 84,48 84,52', TRAZO)}${camino('M80,49 l4,4 l4,-4')}${camino('M60,56 h48 v10 a3,3 0 0 1 -3,3 h-42 a3,3 0 0 1 -3,-3 z', STUDIO)}` },
  // Hablar en vez de escribir: el micrófono, y lo dicho queda escrito
  { clave: 'voz', dibujo: `${caja(20, 10, 18, 32, PERSONA, 9)}${camino('M14,32 a15,15 0 0 0 30,0')}${raya(29, 47, 29, 58)}${raya(21, 58, 37, 58)}${flecha(50, 34, 70)}${caja(74, 14, 38, 44, STUDIO, 6)}${renglones(80, 22, [26, 20, 24, 14])}` },
  // «Pedir revisión»: solo la persona la pide
  { clave: 'revision', dibujo: `${caja(14, 24, 92, 26, MODELO, 13)}${camino('M36,30 a7,7 0 1 1 -6,4', 'stroke:var(--acento,#0d7f6b);fill:none')}${camino('M28,30 l2,4 l4,-1', 'stroke:var(--acento,#0d7f6b);fill:none')}${caja(48, 34.5, 46, 5, ACENTO, 2.5)}${cara(100, 60, 7, PERSONA)}` },
  // «Qué está haciendo»: una ventana como un chat, por turnos
  { clave: 'chat', dibujo: `${caja(8, 4, 104, 66, STUDIO, 8)}${cara(20, 18, 7, MODELO)}${caja(30, 10, 56, 16, MODELO, 8)}${cara(100, 40, 7, STUDIO)}${caja(42, 32, 50, 16, PERSONA, 8)}${cara(20, 60, 7, MODELO)}${caja(30, 52, 40, 14, MODELO, 7, ' opacity=".6"')}` },
  // La línea del proyecto: una carita por revisión, con su lupa
  { clave: 'linea', dibujo: `${raya(40, 6, 40, 66)}${cara(40, 14, 7, MODELO)}${cara(40, 36, 7, MODELO)}${cara(40, 58, 7, PERSONA)}${circulo(90, 46, 11, STUDIO)}${raya(98, 54, 108, 64)}` },
  // Las notas: ramas que salen de la persona y se unen en la revisión
  { clave: 'ramas', dibujo: `${raya(8, 52, 112, 52)}${camino('M26,52 C36,52 36,24 50,24 H70 C84,24 84,52 94,52', 'stroke:var(--sobre-borde,#d4b45a);fill:none')}${circulo(50, 24, 5, PERSONA)}${circulo(70, 24, 5, PERSONA)}${cara(26, 52, 8, PERSONA)}${cara(94, 52, 8, MODELO)}` },
  // Los documentos, una idea a la vez, con su «Entendido»
  { clave: 'documentos', dibujo: `${caja(22, 4, 76, 66, STUDIO, 6)}${renglones(32, 12, [52, 44], ' opacity=".5"')}${caja(28, 28, 64, 24, PERSONA, 6)}${renglones(34, 34, [50, 40])}${caja(64, 56, 28, 10, MODELO, 5)}${visto(72, 61)}` },
  // Las decisiones, al final de su parte: aprobar la recomendación o decidir otra cosa
  { clave: 'decisiones', dibujo: `${caja(10, 4, 100, 40, STUDIO, 6)}${renglones(20, 12, [70, 60, 50])}${caja(10, 50, 52, 18, MODELO, 9)}${visto(24, 59)}${caja(68, 50, 42, 18, PERSONA, 9)}${raya(78, 59, 100, 59)}` },
  // La niebla de lectura: lo leído a la vista, lo que sigue bajo niebla
  { clave: 'niebla', dibujo: `${caja(10, 4, 100, 66, STUDIO, 8)}${renglones(20, 14, [72, 60])}${circulo(24, 36, 4, ACENTO)}${renglones(32, 34, [50])}${caja(14, 42, 92, 24, 'fill:var(--borde,#e4e0d6)', 6, ' opacity=".9"')}${renglones(20, 48, [70, 56], ' opacity=".35"')}` },
  // El botón central del ratón: la rueda
  { clave: 'botonCentral', dibujo: `${camino('M44,8 h32 a16,16 0 0 1 16,16 v24 a20,20 0 0 1 -20,20 h-24 a20,20 0 0 1 -20,-20 v-24 a16,16 0 0 1 16,-16 z', STUDIO)}${raya(60, 8, 60, 34)}${caja(55, 14, 10, 16, MODELO, 5)}${camino('M60,-1 v6 m-4,-3 l4,3 l4,-3', 'stroke:var(--acento,#0d7f6b);fill:none')}` },
  // La voz: lee el bloque mientras la niebla se destapa
  { clave: 'vozAlta', dibujo: `${camino('M12,28 h10 l12,-10 v36 l-12,-10 h-10 z', MODELO)}${camino('M42,26 a12,12 0 0 1 0,20')}${camino('M48,20 a20,20 0 0 1 0,32')}${caja(62, 12, 50, 48, STUDIO, 6)}${renglones(68, 20, [38, 30])}${renglones(68, 38, [36, 26], ' opacity=".35"')}` },
  // La ruta: fases con su puerta, y las que vienen bajo niebla
  { clave: 'ruta', dibujo: `${raya(8, 40, 112, 40)}${caja(12, 30, 26, 20, MODELO, 6)}${caja(42, 22, 4, 36, ACENTO, 2)}${caja(50, 30, 26, 20, PERSONA, 6)}${caja(80, 22, 4, 36, 'fill:var(--borde-fuerte,#cdc8bc)', 2)}${caja(88, 30, 24, 20, STUDIO, 6, ' opacity=".4"')}` },
  // Las propuestas: el director propone y la persona decide
  { clave: 'propuestas', dibujo: `${caja(8, 12, 56, 48, MODELO, 8)}${renglones(16, 22, [40, 32, 36])}${flecha(66, 36, 82)}${cara(98, 24, 9, PERSONA)}${visto(86, 48)}${camino('M104,44 l8,8 m0,-8 l-8,8', 'stroke:var(--peligro,#b3261e);fill:none')}` },
  // «¿Dónde quedamos?»: el marcador de dónde va el proyecto
  { clave: 'dondeQuedamos', dibujo: `${caja(10, 8, 100, 58, STUDIO, 8)}${camino('M24,8 v26 l7,-6 l7,6 v-26', MODELO)}${renglones(48, 18, [52, 44, 48])}${caja(48, 48, 50, 12, PERSONA, 6)}` },
  // El modo ayuda: el «?» que explica cada parte
  { clave: 'ayuda', dibujo: `${caja(8, 8, 66, 54, STUDIO, 8)}${renglones(16, 18, [44, 36])}${caja(16, 40, 30, 12, PERSONA, 5)}${camino('M84,22 h24 a5,5 0 0 1 5,5 v14 a5,5 0 0 1 -5,5 h-14 l-7,6 v-6 h-3 a5,5 0 0 1 -5,-5 v-14 a5,5 0 0 1 5,-5 z', MODELO)}<text x="96" y="40" text-anchor="middle" font-size="16" font-weight="700" style="${ACENTO}">?</text>${raya(50, 46, 76, 40, ' stroke-dasharray="3 3"')}` },
];

/** El consejo que queda a la vista al moverse `paso` desde `actual`, dando la vuelta en los extremos. */
export function moverConsejo(actual: number, paso: number): number {
  const n = CONSEJOS_ESPERA.length;
  return (((actual + paso) % n) + n) % n;
}

/**
 * La espera bloquea: la del diagnóstico, mientras trabaja (sin «Cerrar», y Escape no hace nada). Pero nunca si nadie puede
 * tomar la revisión (`sinDirector`: el Studio no lanza al director, otro tiene el candado o la revisión ya no está): sin
 * eso, la ventana se quedaba bloqueada para siempre, sin salida (auditoría de la entrega, nota nmwcebe0otit). Pura.
 */
export function esperaBloquea(de: EsperaDe, momento: MomentoEspera | null, sinDirector = false): boolean {
  // Cerrada la revisión («cerrando»), ya no: el director terminó su trabajo y la ventana no se retiene hasta que salga, que
  // podía tardar hasta cuatro minutos (auditoría de la entrega, punto 4)
  return de === 'diagnostico' && (momento === null || momento === 'trabajando') && !sinDirector;
}

/**
 * El momento de la revisión pedida desde `desde` (ISO): una anterior no cuenta. Cerrada pero con el director aún terminando
 * lo último (`cerrando`), la página todavía tiene el plan de antes, sin las metas: el botón que lleva a elegir la
 * meta sale cuando ya están (nota nmwbk689ttit), pero la ventana no se retiene mientras tanto: «cerrando» se puede
 * cerrar (auditoría de la entrega, punto 4). Pura.
 */
export function momentoDeEspera(r: Pick<RevisionPedida, 'pedida' | 'hecha' | 'error'> | null | undefined, desde: string, cerrando = false): MomentoEspera {
  if (!r || r.pedida < desde) return 'trabajando';
  if (r.hecha) return cerrando ? 'cerrando' : 'lista';
  if (r.error) return 'fallo';
  return 'trabajando';
}

/**
 * ¿La espera del diagnóstico debe abrirse sola (en cualquier pestaña, también al abrir el Studio otra vez)? Solo mientras
 * el diagnóstico del proyecto activo está pedido y sin terminar (ni hecho ni detenido), y el proyecto aún no tiene meta
 * ni diagnóstico (pd_entrega_fluida, nmwdhucx8tit). Pura.
 */
export function diagnosticoPendiente(r: Pick<RevisionPedida, 'hecha' | 'error'> | null | undefined, conMeta: boolean, conDiagnostico: boolean): boolean {
  return !!r && !r.hecha && !r.error && !conMeta && !conDiagnostico;
}

/** El destino del botón final: tras el diagnóstico, «La meta»; tras la ruta, «Hoy», donde está la lectura corta. */
export function destinoDeEspera(de: EsperaDe): { vista: 'proyecto' | 'misiones'; ancla?: string } {
  return de === 'diagnostico' ? { vista: 'proyecto', ancla: 'p-objetivo' } : { vista: 'misiones' };
}

type Clave = Parameters<typeof t>[0];

/** Los consejos, con el de `consejo` a la vista, sus controles ‹ › y su cuenta. */
function htmlConsejos(consejo: number): string {
  const total = CONSEJOS_ESPERA.length;
  const i = moverConsejo(consejo, 0);
  const figuras = CONSEJOS_ESPERA.map((c, k) => `<figure class="consejo" data-consejo="${k}"${k === i ? '' : ' hidden'}>
          <svg viewBox="0 0 120 72" width="120" height="72" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">${c.dibujo}</svg>
          <figcaption><b>${t(`espera.consejo.${c.clave}.titulo` as Clave)}</b><span>${t(`espera.consejo.${c.clave}.texto` as Clave)}</span></figcaption>
        </figure>`).join('');
  return `<section class="consejos-espera" aria-roledescription="carousel" aria-label="${esc(t('espera.consejos'))}">
        <div class="consejos-pista">${figuras}</div>
        <div class="controles-consejo">
          <button type="button" data-consejo-mover="-1" aria-label="${esc(t('espera.consejoAnterior'))}" title="${esc(t('espera.consejoAnterior'))}">‹</button>
          <span class="cuenta-consejo" data-consejo-cuenta>${t('espera.consejoCuenta', { n: i + 1, total })}</span>
          <button type="button" data-consejo-mover="1" aria-label="${esc(t('espera.consejoSiguiente'))}" title="${esc(t('espera.consejoSiguiente'))}">›</button>
        </div>
      </section>`;
}

/**
 * Lo de dentro del diálogo. El diagnóstico, mientras trabaja: los consejos (el de `consejo` a la vista) y, abajo, el
 * cargador que dice qué hace el director, sin «Cerrar». La ruta, y cualquier espera al terminar o al detenerse: su título,
 * sus etapas o lo siguiente, y sus botones. Todo dentro de un cuerpo con su margen (el diálogo no tiene formulario, y el
 * margen de `.dialogo-director form` no le llegaba: nota nmwb8rwsntit). Pura (salvo los textos).
 */
export function htmlEspera(de: EsperaDe, momento: MomentoEspera, nombre: string, consejo = 0, sinDirector = false, nuevo = false): string {
  const lista = momento === 'lista';
  const titulo = t((lista ? textoDeEspera(de, 'lista', nuevo) : momento === 'fallo' ? 'espera.fallo' : textoDeEspera(de, 'titulo', nuevo)) as Clave, { nombre: esc(nombre) });
  // Arriba, la barra de las cinco paradas (pd_entrega_fluida, nmwdhtp2ntit): cerrando, lo del director ya está hecho
  const paradas = htmlParadas(paradaDeEspera(de, lista || momento === 'cerrando'), nuevo);
  if (esperaBloquea(de, momento, sinDirector)) {
    return `<div class="cuerpo-espera bloquea">
      ${paradas}
      <header class="cabeza-dialogo"><h2>${titulo}</h2></header>
      ${htmlConsejos(consejo)}
      <p class="cargando-espera" role="status">${t(nuevo ? 'espera.planteando' : 'espera.diagnosticando', { nombre: esc(nombre) })}<span class="puntos" aria-hidden="true"><i></i><i></i><i></i></span></p>
    </div>`;
  }
  // Cerrando, lo del director ya está hecho: sus etapas, marcadas, y la ventana se puede cerrar
  const hechas = lista || momento === 'cerrando';
  const etapas = de === 'ruta' || hechas
    ? `<ol class="etapas-espera" aria-label="${esc(t('espera.etapas'))}">${(de === 'diagnostico' && nuevo ? ETAPAS_PLANTEAMIENTO : ETAPAS_ESPERA[de]).map((k) => `<li class="${hechas ? 'hecha' : 'por-hacer'}">${hechas ? '✓' : '·'} ${t(k as Clave)}</li>`).join('')}</ol>`
    : '';
  const como = momento === 'trabajando' ? `<p class="como">${t('espera.puedesCerrar')}<span class="puntos" aria-hidden="true"><i></i><i></i><i></i></span></p>`
    : momento === 'cerrando' ? `<p class="como">${t('espera.cerrandoComo')}<span class="puntos" aria-hidden="true"><i></i><i></i><i></i></span></p>`
    : momento === 'fallo' ? `<p class="como">${t('espera.falloComo')}</p>` : `<p class="como">${t(`espera.${de}.siguiente`)}</p>`;
  const seguir = lista ? `<button type="button" class="primario" data-espera-seguir>${t(`espera.${de}.boton`)}</button>` : '';
  // El diagnóstico listo lleva solo a la meta; detenido, o la ruta, se cierran cuando se quiere
  const cerrar = de === 'diagnostico' && lista ? '' : `<button type="button" data-espera-cerrar>${t('espera.cerrar')}</button>`;
  return `<div class="cuerpo-espera">
      ${paradas}
      <header class="cabeza-dialogo"><h2>${titulo}</h2></header>
      ${etapas}
      ${como}
      <div class="botones">${cerrar}${seguir}</div>
    </div>`;
}
