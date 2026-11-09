// La línea viva del proyecto, en la barra y al pie del modo enfoque (pedidos pd_linea_viva, pd_linea_ramas,
// pd_linea_historia y pd_linea_ciclo; notas de voz del titular nmvt5j010tit, nmvt5kudptit, nmvtgu78itit, nmvtgxhiztit,
// nmvtgydm0tit, nmvth8zj7tit, nmvti6za5tit, nmvtj98k5tit, nmvtk5sfetit, nmvtk8pr3tit, nmvtki8k2tit y nmvtknaqytit, 29 de
// octubre de 2026). Una línea dorada que ondula, y sobre ella tú, el cubito con carita de «Qué es STL», al centro: la
// línea corre hacia la izquierda mientras avanzas, despacio con el reloj y un paso con cada cosa que le dejas al
// director. Cada cosa nace de ti, en una rama de su tipo: su base se queda donde nació, sube o baja hasta su altura (una
// por rama, repartidas de afuera hacia adentro para que no se crucen ni se encimen) y su cabeza te sigue en paralelo,
// dibujando su estela. Al pedir la revisión aparece el director en ese punto de la línea y se queda ahí, y tú das un
// salto adelante, aparte de él, porque puedes seguir (nmvtnd08xtit, nmvtnerr3tit): lo que dejas después nace de ti, no
// de él. Las ramas que nacieron antes se juntan en él en quince segundos y después sus cabecitas giran a su alrededor
// mientras trabaja (nmvtnwub1tit, nmvttk603tit); un clic en él abre lo que va haciendo, desde el primer momento, y late
// encima de todo. Mientras revisa avanzas más lento y los dos comparten el enfoque (nmvtu16qctit); en la barra y en la
// franja del enfoque, se arrastra para mirar el pasado (nmvtu61hxtit, nmvvii0vwtit). Al cerrarse, el punto queda marcado y el lote de tus
// misiones se reparte hacia adelante, en el futuro: al entregar cada una, llegas a ella. La historia de cada revisión
// vive en la memoria del proyecto (historiaLinea.ts). Todo sale de la hora: repintar, o recargar el Studio a mitad de
// una rama, no la rompe (nmvtk8pr3tit).

import { informeDeRevision, type ClaseRama, type InformeDeRevision, type Rama, type RevisionDeLinea } from '../../src/director/historiaLinea';
import { caraDentro } from './cara';
import { t as tx, type ClaveDeTexto } from './textos';

export { CLASES_RAMA, dosLineas, ramasDeAhora, type ClaseRama, type Rama } from '../../src/director/historiaLinea';

/** Cómo se llama cada rama, para el globo y para quien no ve el dibujo: la clave de su texto, que se lee al dibujar (cambia con el idioma). */
const NOMBRE_RAMA: Record<ClaseRama, ClaveDeTexto> = {
  respuesta: 'linea.rama.respuesta', ajuste: 'linea.rama.ajuste', idea: 'linea.rama.idea', falla: 'linea.rama.falla', pregunta: 'linea.rama.pregunta',
  eleccion: 'linea.rama.eleccion', hazlo: 'linea.rama.hazlo', entrega: 'linea.rama.entrega',
};

/** Cuántas ramas de ahora se dibujan como mucho: más no caben sin volverse una mancha. */
export const MAX_RAMAS = 24;

/** Cuántas ramas ya juntadas, de las revisiones de antes, se dibujan como mucho. */
const MAX_PASADAS = 40;

/** Cuánto avanzas por minuto, en unidades del dibujo: como un minutero. */
export const PASO_POR_MINUTO = 0.4;

/** Cuánto avanzas con cada cosa que le dejas al director: así la base de cada rama se ve quedarse donde nació. */
export const PASO_POR_RAMA = 12;

/** Lo que tarda ese paso, en milisegundos: la línea corre suave y la rama nueva crece mientras tanto. */
export const DURA_PASO = 2600;

/**
 * Lo que adelantas al pedir la revisión: así quedas aparte del director, que se queda ahí, y sigues (nmvtnd08xtit); más
 * lejos que antes, para que no se congestione donde él trabaja (nota de voz nmvttk603tit).
 */
export const SALTO_REVISION = 44;

/**
 * Lo que tardan las ramas en juntarse en el director desde que aparece, y después giran a su alrededor (nmvtnwub1tit): un
 * cuarto del minuto de antes (nota de voz nmvttk603tit), y de eso, el 30 %, para que se vea más fluido (nota de voz del
 * titular nmvvx1u1ptit, 31 de octubre de 2026).
 */
export const DURA_CONVERGE = 4_500;

/**
 * Mientras el director revisa, avanzas mucho más lento (el reloj y cada cosa que le dejas, a un cuarto), y los dos
 * comparten el enfoque: el par va centrado y, si se alejan más de la mitad del ancho, lo que hay entre los dos se aprieta,
 * para que el director nunca salga del cuadro ni deje de poder abrirse con un clic (nota de voz nmvtu16qctit). Al
 * cerrarse, el enfoque vuelve a ti en DURA_FOCO, y avanzas al paso de siempre.
 */
export const LENTO_EN_REVISION = 0.25;
export const FOCO_MAXIMO = 0.5;
const DURA_FOCO = 3000;

/**
 * La barra se arrastra para mirar hacia atrás (nota de voz nmvtu61hxtit): al soltarla espera ESPERA_REGRESO y la cámara
 * vuelve a ti a una velocidad constante, VELOCIDAD_REGRESO unidades del dibujo por segundo (en la barra, unos tantos
 * píxeles), sea cual sea lo que se arrastró: no en un tiempo fijo, que hacía ir muy rápido lo lejano y muy lento lo
 * cercano (nota de voz del titular nmvvjyx9ctit, 30 de octubre de 2026). Solo los últimos FRENO_REGRESO frenan, suave.
 * A la mitad de lo que era (140): más despacio, para que se vea fluido; quien quiera, la trae más rápido arrastrándola
 * (nota de voz del titular nmvvmggqgtit, 30 de octubre de 2026).
 */
export const ESPERA_REGRESO = 2000;
export const VELOCIDAD_REGRESO = 70;
export const FRENO_REGRESO = 10;

/** Lo que tarda una vuelta de las cabecitas alrededor del director, y un latido suyo, en segundos. */
const ORBITA_DURA = 14;
const LATIDO_DURA = 1.6;

/**
 * La entrada del director al pedir la revisión (nota de voz del titular nmvwjjvt6tit, 31 de octubre de 2026: aparecía de
 * golpe, «de una foto a otra»): surge desde su centro, crece un poco más de la cuenta, hasta ESCALA_REBOTE, y se acomoda,
 * como un resorte, en DURA_ENTRADA milisegundos. Las cabecitas que juntó salen a girar desde él en DURA_SALIDA, en vez de
 * aparecer de una vez en su órbita. Las dos se cuentan desde que apareció (aqui), como su latido: repintar no las vuelve
 * a empezar. Con «menos movimiento», ya en su lugar.
 */
export const DURA_ENTRADA = 1200;
export const ESCALA_REBOTE = 1.15;
export const DURA_SALIDA = 900;

/** Una animación que se da una vez, `pasado` ms después de empezar, y se queda en su final; nada si ya terminó. Pura. */
const unaVez = (pasado: number, dura: number, anim: (dur: string, begin: string) => string) =>
  pasado >= dura ? '' : anim(`${dura / 1000}s`, `-${n3(Math.max(0, pasado) / 1000)}s`);

/** La onda de la línea: su altura (un 20 % menos que los 3,6 de antes, nota de voz nmvvmm2rntit) y cuánto tarda una ida y vuelta, en segundos. */
export const ONDA_ALTO = 2.88;
const ONDA_DURA = 7;

/** Lo que tarda una rama en subir o bajar hasta su altura, y en volver a la línea en el director, en unidades del dibujo. */
const CURVA = 10;
const JUNTA = 18;
const MUESTRA = 4;

/** El tamaño del dibujo en la barra; al pie del enfoque, el mismo alto por unidad y tanto ancho como haya. */
const ANCHO_BARRA = 200;
const ALTO_BARRA = 220;

/**
 * Lo que se separan, como poco, dos cabecitas vecinas de un mismo lado: con menos, ya no se leen con el ratón. Antes de
 * apilarlas así, la franja del enfoque crece hacia arriba mientras la pantalla lo deje (nota de voz nmvttbn0otit).
 */
export const SEPARACION_CABEZAS = 10;
/** Lo más alto que se pide para la franja: el CSS lo corta antes, con lo que deja la pantalla. */
const ALTO_MAXIMO = 640;

/** El fondo de espacio de la franja (fondo-del-enfoque.md): cuántas estrellas por unidad de área, en cada capa. */
const AREA_POR_LEJANA = 1500;
const AREA_POR_CERCANA = 2800;
/**
 * Las dos capas se corren con la línea, como un parallax (decisión nmvtt7bu6tit): las cercanas, casi a su paso, y las
 * lejanas, a un tercio; unas tres veces más rápido que antes, para que se sienta que avanza (nota de voz nmvtut733tit).
 */
export const PASO_ESTRELLAS = 0.9;
export const PASO_LEJANAS = 1 / 3;
/**
 * Y avanzan siempre, despacio, como si la línea viajara por el espacio, no solo cuando tu personaje pasa de una misión a
 * otra (pedido pd_estrellas_siempre, nota de voz del titular nmvvvkktstit): a un tercio del paso que llevan cuando avanzas
 * (su elección nmvvwzgtmtit, 30 de octubre de 2026), en unidades del dibujo por segundo, cada capa a su parallax; y al
 * verlas, el triple, el mismo paso que llevan cuando avanzas (nota de voz del titular nmvvyou1ytit, 31 de octubre). Al
 * avanzar, el paso de siempre se suma encima.
 */
export const DERIVA_ESTRELLAS = PASO_POR_RAMA / (DURA_PASO / 1000);

const n1 = (x: number) => Math.round(x * 10) / 10;
const n3 = (x: number) => Math.round(x * 1000) / 1000;
const dentro = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const suave = (u: number) => {
  const v = dentro(u, 0, 1);
  return v * v * (3 - 2 * v);
};
const FASES = [0, Math.PI];

/**
 * La altura de la rama i de un grupo de n (por orden de nacimiento): arriba y abajo, alternadas, y cada una más adentro
 * que la anterior de su lado, para que la que nace después no cruce a las que ya van en paralelo. Las de cada lado se
 * reparten parejas en todo el alto, de la orilla a la línea, antes de apilarse (nota de voz nmvtv593wtit: las primeras
 * se apilaban arriba con espacio de sobra): al nacer otra, las de su lado se reacomodan. Distintas siempre. Puro.
 */
export function alturaDeRama(i: number, alto = ALTO_BARRA, n = i + 1): number {
  const lado = i % 2 === 0 ? -1 : 1;
  const k = Math.floor(i / 2);
  const suyas = lado < 0 ? Math.ceil(n / 2) : Math.floor(n / 2);
  const min = alto * 0.09;
  const max = alto / 2 - 9;
  return lado * (max - (suyas > 1 ? k / (suyas - 1) : 0) * (max - min));
}

/** La menor distancia entre dos cabecitas vecinas de un mismo lado, con n ramas y ese alto (sin vecinas, infinita). Puro. */
export function separacionDeCabezas(n: number, alto: number): number {
  const vistas = Math.min(n, MAX_RAMAS);
  const alturas = Array.from({ length: vistas }, (_, i) => alturaDeRama(i, alto, vistas));
  let menor = Infinity;
  for (const lado of [-1, 1]) {
    const suyas = alturas.filter((h) => Math.sign(h) === lado).sort((a, b) => a - b);
    for (let i = 1; i < suyas.length; i++) menor = Math.min(menor, suyas[i] - suyas[i - 1]);
  }
  return menor;
}

/**
 * El alto que necesita la franja del enfoque para que n cabecitas a la vez no se apilen: el de siempre mientras caben, y
 * más, de dos en dos, hasta que quedan a SEPARACION_CABEZAS (nmvttbn0otit). Puro.
 */
export function altoParaRamas(n: number): number {
  let alto = ALTO_FRANJA;
  while (alto < ALTO_MAXIMO && separacionDeCabezas(n, alto) < SEPARACION_CABEZAS) alto += 2;
  return alto;
}

/**
 * Cuántas cabecitas van a la vez en un mismo punto: las que van contigo y, mientras el director aún no las junta, las que
 * recoge. Ya juntas (giran a su alrededor) o con la revisión cerrada, la franja vuelve a su alto. Puro.
 */
export function cabezasALaVez(ramas: Rama[], aqui: string | null, ahora: number, quieta = false, desde?: number): number {
  const { recogidas, contigo } = gruposDeRamas(ramas, aqui);
  if (!aqui) return contigo.length;
  return Math.max(contigo.length, juntadoAl(aqui, ahora, quieta, desde) >= 1 ? 0 : recogidas.length);
}

/**
 * Las ramas de ahora en sus dos grupos: las que junta el director de la revisión en marcha (nacidas hasta que apareció)
 * y las que van contigo, cada grupo con sus MAX_RAMAS más nuevas. Antes se tomaban las MAX_RAMAS más nuevas de todas y
 * después se partían: con muchas notas dejadas mientras revisa, las que él junta quedaban fuera y el director giraba
 * con una o dos (lo visto en la revisión del 30 de octubre, por la nota de voz del titular nmvvjxk0ptit). Puro.
 */
export function gruposDeRamas<R extends { cuando: string }>(ramas: R[], aqui: string | null): { recogidas: R[]; contigo: R[] } {
  if (!aqui) return { recogidas: [], contigo: ramas.slice(-MAX_RAMAS) };
  return { recogidas: ramas.filter((r) => r.cuando <= aqui).slice(-MAX_RAMAS), contigo: ramas.filter((r) => r.cuando > aqui).slice(-MAX_RAMAS) };
}

/** Un número entre 0 y 1 que sale siempre igual de i y de su semilla: las estrellas no saltan al repintar. */
const azar = (i: number, semilla: number) => {
  const s = Math.sin(i * 12.9898 + semilla * 78.233) * 43758.5453;
  return s - Math.floor(s);
};

/**
 * El fondo de espacio de la línea, en la franja del enfoque y en la barra (fondo-del-enfoque.md, decisiones nmvtt4da2tit y nmvtt7bu6tit; la barra, pd_barra_galaxia): dos capas
 * de estrellas pequeñas y de brillo bajo, sin halo para no confundirse con las cabecitas, que se corren con la línea
 * cuando avanzas, como un parallax: las lejanas, despacio, y las cercanas, casi a su paso. Y siempre, despacio
 * (DERIVA_ESTRELLAS): cada capa se corre sola con una animación del mismo SVG, que empieza según la hora para no saltar
 * al repintar, y cada estrella va dos veces, a un ancho de distancia, para que la vuelta no se note. Es el mismo cielo
 * oscuro en los dos temas (nota de voz nmvtut733tit: la carta celeste del claro no se veía; reemplaza la decisión
 * nmvtt8v47tit). Con «menos movimiento», quietas. Las nubes y el degradado son del CSS (estilos.css › --lv-espacio). Puro.
 */
export function svgEstrellas(ancho: number, alto: number, recorrido: number, ahora = 0, quieta = false): string {
  const lejanas = Math.round((ancho * alto) / AREA_POR_LEJANA);
  const cercanas = Math.round((ancho * alto) / AREA_POR_CERCANA);
  const capa = (n: number, semilla: number, paso: number, radio: (i: number) => number) => {
    // Un ancho entero en lo que tarda a su paso; sin fin. Lo que ya derivó según la hora va en su sitio, y la animación
    // empieza de cero al pintarla: si el navegador pinta un cuadro antes de arrancarla, las estrellas no saltan hacia
    // atrás (nota de voz del titular nmvvyrasktit: al nacer una rama, la línea se repinta seguido y trastabillaba)
    const dura = n1(ancho / (DERIVA_ESTRELLAS * paso));
    const derivado = quieta ? 0 : (((ahora / 1000) % dura) / dura) * ancho;
    const xs = Array.from({ length: n }, (_, i) => (((azar(i, semilla) * ancho - recorrido * paso - derivado) % ancho) + ancho) % ancho);
    const estrella = (x: number, i: number) => `<circle cx="${n1(x)}" cy="${n1(azar(i, semilla + 1) * alto)}" r="${n1(radio(i))}"/>`;
    const todas = `${xs.map(estrella).join('')}${xs.map((x, i) => estrella(x + ancho, i)).join('')}`;
    // Con CSS, no con una animación del SVG: esa corre en el hilo de la página, y se paraba con cada carga (nmvzpuv5jtit)
    return quieta ? todas : `<g class="lv-deriva" style="--lv-ancho:${n1(ancho)};animation-duration:${dura}s">${todas}</g>`;
  };
  const lejos = capa(lejanas, 1, PASO_LEJANAS, (i) => 0.35 + azar(i, 3) * 0.45);
  const cerca = capa(cercanas, 4, PASO_ESTRELLAS, (i) => 0.6 + azar(i, 6) * 0.5);
  return `<g class="lv-espacio" aria-hidden="true"><g class="lv-estrellas-lejos">${lejos}</g><g class="lv-estrellas-cerca">${cerca}</g></g>`;
}

/**
 * Las estrellas detrás de todo el menú de la barra (pedido pd_barra_galaxia): las mismas, una unidad por píxel, así que van
 * al paso de las del enfoque, y quietas con «menos movimiento». Más tenues las pone el CSS (estilos.css › .cielo-lateral).
 * No se corren con la línea: esa, con las suyas, va encima. Puro.
 */
export function svgCieloLateral(ancho: number, alto: number, ahora: number, quieta = false): string {
  return `<svg viewBox="0 0 ${ancho} ${alto}" preserveAspectRatio="none" aria-hidden="true">${svgEstrellas(ancho, alto, 0, ahora, quieta)}</svg>`;
}

/** Tu personaje, el cubito con carita, centrado en su punto: el mismo en la barra, en el enfoque y en la línea en grande. Su gradiente, GRADIENTE_DE_TU. */
const CUERPO_DE_TU = `<circle class="lv-tu-luz" r="11"/>
<rect class="lv-tu-cuerpo" x="-5.5" y="-5.5" width="11" height="11" rx="3" fill="url(#lv-tu)"/>
<ellipse class="lv-tu-ojo" cx="-2.1" cy="-0.9" rx="0.8" ry="1.1"/><ellipse class="lv-tu-ojo" cx="2.1" cy="-0.9" rx="0.8" ry="1.1"/>
<path class="lv-tu-boca" d="M-1.5 2 Q0 3.2 1.5 2"/>`;
const GRADIENTE_DE_TU ='<linearGradient id="lv-tu" x1="0" y1="0" x2="0" y2="1"><stop class="lv-tu-1" offset="0"/><stop class="lv-tu-2" offset="1"/></linearGradient>';

/** Una misión del lote de la persona, en el futuro de la línea: la entregada lleva cuándo. */
export interface MisionEnLinea {
  id: string;
  titulo: string;
  entregada?: string;
}

export interface OpcionesLinea {
  /** El momento que se dibuja (milisegundos). Sin él, el de lo más nuevo que se dibuja. */
  ahora?: number;
  /** Las revisiones de antes, con sus ramas ya juntadas. */
  historia?: RevisionDeLinea[];
  /** Las fases que aún no llegan: una rama de la historia que su respuesta llevó a una de ellas se ve tenue (pd_linea_completa). */
  porVenir?: string[];
  /** Cuándo cerró la última revisión: queda marcada en la línea. */
  revisado?: string;
  /**
   * La revisión en marcha: dónde apareció el director (su corte), cuántos permisos se le negaron (su aviso rojo) y qué
   * revisión es (`vez`: su corte cambia al lanzarla y sigue siendo la misma). `desde` lo pone el dibujo al pintar: desde
   * cuándo se cuenta su entrada (vistaDelDirector).
   */
  revision?: { aqui: string; negados?: number; vez?: string; desde?: number } | null;
  /**
   * El lote de misiones de la persona, en su orden: primero las que entregó desde la última revisión (con cuándo) y
   * después las abiertas. Se reparte hacia adelante, en el futuro de la línea.
   */
  lote?: MisionEnLinea[];
  /** El tamaño del dibujo, en unidades: el de la barra si no se da. */
  ancho?: number;
  alto?: number;
  /** El alto en que se reparten las ramas, si no llenan todo el dibujo (la línea en grande deja el cielo a la vista): todo el alto si no se da. */
  altoRamas?: number;
  /** Con «menos movimiento»: cada paso, de una vez. */
  quieta?: boolean;
  /** Con el fondo de espacio, sus dos capas de estrellas: en la franja del enfoque y en la barra. */
  fondo?: boolean;
  /** Cuánto se corrió la cámara al arrastrar la barra, en unidades: hacia atrás, positivo; hacia adelante, negativo. */
  corrido?: number;
  /**
   * La historia entera, sin tope de ramas, para mirarla con calma (la línea en grande, lineaGrande.ts): lo que queda lejos
   * de la vista no se dibuja, y hay que repintarla al correrla más de MARGEN_COMPLETA.
   */
  completa?: boolean;
  /** Con `completa`, todo lo que hay hasta ti, aunque quede lejos de la vista: para volver a ti sin rehacer el dibujo (nmvzps27qtit). */
  hastaTi?: boolean;
  /**
   * Desde cuándo se cuenta el paso de lo que acaba de llegar, por su id (`m:<id>` para una misión entregada): el momento en
   * que esta página lo pintó, no la hora del servidor (pasosVistos). Lo que no está aquí se cuenta desde su hora.
   */
  desdeDe?: Record<string, number>;
  /** Dónde va tu personaje, como parte del ancho: al centro si no se dice. */
  lugarTu?: number;
  /** Lo que se marca encima de la línea en cada momento dado (las revisiones, en la línea en grande): su `html` recibe dónde cae. */
  puntos?: { cuando: string; html: (x: number, y: number) => string }[];
}

/** Lo que se dibuja más allá de lo que se ve, a cada lado, en la línea completa: de sobra para correrla un trecho sin repintarla. */
export const MARGEN_COMPLETA = 300;
/**
 * Los puntos de un trazo, sobre una rejilla fija del dibujo y no contados desde donde empieza: la curva en un punto no depende
 * de hasta dónde esté corrida la cámara, y repintar no cambia cómo ondula (nota de voz del titular nmvztv1j7tit). Pura.
 */
const enRejilla = (x0: number, x1: number): number[] => {
  const xs = [x0];
  for (let x = (Math.floor(x0 / MUESTRA) + 1) * MUESTRA; x < x1; x += MUESTRA) xs.push(x);
  xs.push(x1);
  return xs;
};
/** Lo que queda libre a la izquierda de lo más viejo, al llegar a ello en la línea completa. */
const MARGEN_VIEJO = 24;

/**
 * Cuánto sigue corrida la cámara de la barra en un momento: lo arrastrado mientras se arrastra y ESPERA_REGRESO después
 * de soltarla, y luego vuelve a ti a VELOCIDAD_REGRESO, la misma para cualquier distancia (nmvtu61hxtit, nmvvjyx9ctit);
 * en los últimos FRENO_REGRESO frena, sin saltar al llegar. Puro.
 */
export function corridoAl(corrido: number, soltada: number | null, ahora: number): number {
  if (soltada === null) return corrido;
  const distancia = Math.abs(corrido);
  const andado = (VELOCIDAD_REGRESO * Math.max(0, ahora - soltada - ESPERA_REGRESO)) / 1000;
  // A velocidad constante hasta el freno; ahí, lo que falta se recorre en el tiempo que tomaría a esa velocidad, suave
  const recto = Math.max(0, distancia - FRENO_REGRESO);
  const freno = Math.min(distancia, FRENO_REGRESO);
  const queda = andado <= recto ? distancia - andado : freno * (1 - suave((andado - recto) / (2 * FRENO_REGRESO)));
  return queda < 0.05 ? 0 : Math.sign(corrido) * queda;
}

/** Lo que tarda la vuelta desde que empieza, en milisegundos: crece con la distancia, a velocidad constante. Puro. */
export const duraRegreso = (corrido: number) =>
  (1000 * (Math.max(0, Math.abs(corrido) - FRENO_REGRESO) + 2 * Math.min(Math.abs(corrido), FRENO_REGRESO))) / VELOCIDAD_REGRESO;

/** Dónde se juntaron las ramas de una revisión de la historia: donde apareció el director (su corte) o, si no se sabe, al cerrar. */
const claveDeRevision = (h: RevisionDeLinea) => h.corte ?? h.junto;

/** Una rama por dibujar: de dónde nace, su altura y hasta dónde llega su cabeza. */
interface Trazo {
  c: ClaseRama;
  nace: number;
  altura: number;
  /** Donde termina: el director que la recoge, o tú. */
  fin: number;
  /** Lo que tarda en subir hasta su altura: nacida mientras el director revisa, a un cuarto, como el paso que se da. */
  curva: number;
  /** Cuánto la recogió el director (0: aún va a su altura). Sin director, 0. */
  avance: number;
  junta: boolean;
  globo?: string;
  id?: string;
}

/**
 * Cuánto lleva juntado el director de la revisión en marcha, de 0 a 1, desde que apareció a la vista (`desde`;
 * vistaDelDirector), sin depender de lo que informe; con «menos movimiento», de una vez. Puro.
 */
export function juntadoAl(aqui: string, ahora: number, quieta = false, desde?: number): number {
  if (quieta) return 1;
  return suave((ahora - (desde ?? Date.parse(aqui))) / DURA_CONVERGE);
}

/** Lo que se tolera sin pintar mientras el director entra: más que esto es una parada, y su entrada la espera. */
const HUECO_MAXIMO = 250;

/** La entrada del director de una revisión: cuál es, desde cuándo se cuenta y cuándo se pintó por última vez. */
export interface VistaDelDirector { vez: string; desde: number; ultimo: number }

/**
 * Por qué se saltaba que el director recogiera las ramas (nota de voz del titular nmvxxk7kbtit, 1 de noviembre de 2026): sus
 * 4,5 segundos se contaban desde la hora en que el servidor lanzó la revisión, que llega a la página en una respuesta de
 * varios MB, y mientras esa respuesta se lee y se pinta, la página no se mueve. Cuando por fin pintaba, ya había pasado
 * todo: quedaba girando de una vez. Ahora se cuenta desde la primera vez que esta página lo pinta, y lo que no se pinta
 * (una parada de más de HUECO_MAXIMO, la pestaña oculta, un globo abierto) no se le descuenta. Después de su entrada, nada
 * se corre. Con otra revisión, otra vez. Puro.
 */
export function vistaDelDirector(antes: VistaDelDirector | null, vez: string, ahora: number): VistaDelDirector {
  if (antes?.vez !== vez) return { vez, desde: ahora, ultimo: ahora };
  return { vez, ...movimientoVisto(antes, ahora, DURA_CONVERGE + DURA_SALIDA) };
}

/** Lo que se está moviendo, en otro cuadro: lo que la página no pintó, mientras dura, no se le descuenta. Puro. */
export function movimientoVisto(antes: { desde: number; ultimo: number }, ahora: number, dura: number): { desde: number; ultimo: number } {
  const parada = ahora - antes.ultimo;
  return { desde: ahora - antes.desde < dura && parada > HUECO_MAXIMO ? antes.desde + parada : antes.desde, ultimo: ahora };
}

/** Lo más viejo que aún da su paso al llegar a la página: lo de antes, como lo que trae otro proyecto al abrirlo, ya lo dio. */
const RECIENTE_AL_LLEGAR = 60_000;

/** Lo que la página ya conoce y los pasos que se le están contando desde que los pintó. */
export interface PasosVistos { conocidas: ReadonlySet<string>; enMarcha: ReadonlyMap<string, { desde: number; ultimo: number }> }

/**
 * Por qué la línea saltaba al elegir una opción (nota de voz del titular nmvzpuv5jtit, 2 de noviembre de 2026): el paso de cada
 * rama se contaba desde la hora en que el servidor guardó la nota, y mientras su respuesta llegaba (el loader) y la página se
 * repintaba, nadie lo dibujaba. Al pintarla ya llevaba un buen trecho, y la línea y las estrellas saltaban de golpe. Como la
 * entrada del director (vistaDelDirector): se cuenta desde que esta página lo pinta, sin descontarle sus paradas. Lo que ya
 * estaba al abrir la página no vuelve a dar su paso. Puro.
 */
export function pasosVistos(antes: PasosVistos | null, llegan: readonly { id: string; cuando?: string }[], ahora: number): PasosVistos {
  const enMarcha = new Map<string, { desde: number; ultimo: number }>();
  for (const [id, m] of antes?.enMarcha ?? []) {
    const sigue = movimientoVisto(m, ahora, DURA_PASO);
    if (ahora - sigue.desde < DURA_PASO) enMarcha.set(id, sigue);
  }
  if (antes) for (const { id, cuando } of llegan) {
    if (!cuando || antes.conocidas.has(id) || enMarcha.has(id)) continue;
    const edad = ahora - Date.parse(cuando);
    if (edad < RECIENTE_AL_LLEGAR) enMarcha.set(id, { desde: ahora, ultimo: ahora });
  }
  return { conocidas: new Set(llegan.map((x) => x.id)), enMarcha };
}

/**
 * El dibujo, en SVG: la línea que ondula con su luz, tú al centro, las ramas de ahora con sus cabezas a tu paso, el
 * director de la revisión en marcha con las cabecitas que juntó girando a su alrededor, cada revisión de antes marcada
 * con sus ramas juntándose ahí, y tu lote de misiones repartido hacia adelante. Puro.
 */
export function svgLineaViva(ramas: Rama[], op: OpcionesLinea = {}): string {
  const ancho = op.ancho ?? ANCHO_BARRA;
  const alto = op.alto ?? ALTO_BARRA;
  const linea = alto / 2;
  const corrido = op.corrido ?? 0;
  // Lo que se ve, en las unidades de lo dibujado: al correr la cámara hacia atrás, aparece lo que estaba a la izquierda.
  // Mientras vuelve, solo se corre su grupo (lv-camara), sin rehacer el dibujo: la línea ya llega hasta el borde para
  // cualquier punto de esa vuelta, también desde adelante. La línea completa se arrastra sin repintarse, y por eso se dibuja
  // también MARGEN_COMPLETA a la izquierda de la vista (nota de voz del titular nmvztv1j7tit)
  const xInicio = 4 - Math.max(0, corrido) - (op.completa ? MARGEN_COMPLETA : 0);
  const xMision = ancho - 12;
  const historia = op.historia ?? [];
  const porVenir = new Set(op.porVenir ?? []);
  const lote = op.lote ?? [];
  const masNuevo = [...ramas.map((r) => r.cuando), ...historia.map((h) => h.junto), op.revisado ?? '', ...lote.map((m) => m.entregada ?? '')].sort().pop() || '';
  const ahora = op.ahora ?? (masNuevo ? Date.parse(masNuevo) : 0);
  // Con «menos movimiento», el paso se da en un milisegundo: de una vez
  const dura = op.quieta ? 1 : DURA_PASO;
  const aqui = op.revision?.aqui ?? null;

  // Mientras el director revisa (de su corte a su cierre, también en las de antes), avanzas a un cuarto (nmvtu16qctit)
  const lentos = [
    ...historia.filter((h) => h.corte).map((h) => [Date.parse(h.corte!), Date.parse(h.junto)] as const),
    ...(aqui ? [[Date.parse(aqui), Infinity] as const] : []),
  ].filter(([a, b]) => Number.isFinite(a) && b > a);
  const esLento = (t: number) => lentos.some(([a, b]) => t > a && t <= b);
  const minutosLentos = (t: number) => lentos.reduce((s, [a, b]) => s + Math.max(0, Math.min(t, b) - a), 0) / 60_000;

  // Lo que has avanzado hasta un momento: el reloj, más un paso por cada rama que nació antes y un salto por cada revisión
  // pedida (suaves mientras se dan)
  const desdeDe = op.desdeDe ?? {};
  const saltos = [...historia.map(claveDeRevision), ...(aqui && !historia.some((h) => claveDeRevision(h) === aqui) ? [aqui] : [])];
  // Tu paso adelante se cuenta desde que esta página pinta al director, como su entrada, no desde la hora del servidor: si
  // no, al llegar la respuesta ya lo habías dado, y aparecías adelante de una vez (nota de voz del titular nmvzod6tmtit)
  const saltoVisto = aqui ? op.revision?.desde ?? null : null;
  const paso = (t: number, visto?: number) => ({ t: visto ?? t, w: PASO_POR_RAMA * (esLento(t) ? LENTO_EN_REVISION : 1) });
  const pasos = [
    ...ramas.map((r) => paso(Date.parse(r.cuando), desdeDe[r.id])),
    ...historia.flatMap((h) => h.ramas.map((r) => paso(Date.parse(r.t)))),
    ...saltos.map((s) => ({ t: s === aqui && saltoVisto !== null ? saltoVisto : Date.parse(s), w: SALTO_REVISION })),
  ].filter((p) => Number.isFinite(p.t)).sort((a, b) => a.t - b.t);
  // Lo acumulado en una sola pasada: copiar la lista en cada paso costaba, con mil pasos, un millón de copias por cuadro
  const acumulado = [0];
  for (const p of pasos) acumulado.push(acumulado[acumulado.length - 1] + p.w);
  const cuantosHasta = (t: number) => {
    let a = 0;
    let b = pasos.length;
    while (a < b) {
      const m = (a + b) >> 1;
      if (pasos[m].t <= t) a = m + 1;
      else b = m;
    }
    return a;
  };
  const recorrido = (t: number) => {
    const n = cuantosHasta(t - dura);
    let r = acumulado[n];
    for (let i = n; i < pasos.length && pasos[i].t < t; i++) r += pasos[i].w * suave((t - pasos[i].t) / dura);
    return (t / 60_000 - minutosLentos(t) * (1 - LENTO_EN_REVISION)) * PASO_POR_MINUTO + r;
  };
  const yaRecorrido = recorrido(ahora);

  // El enfoque, compartido mientras el director revisa (nmvtu16qctit): el par al centro y, si se alejan más de
  // FOCO_MAXIMO del ancho, lo de entre los dos apretado; al cerrarse, vuelve a ti en DURA_FOCO
  const cerrada = aqui ? null : [...historia].filter((h) => h.corte && ahora - Date.parse(h.junto) < (op.quieta ? 1 : DURA_FOCO) && ahora >= Date.parse(h.junto)).pop();
  const corteFoco = aqui ?? cerrada?.corte ?? null;
  const compartido = aqui ? 1 : cerrada ? 1 - suave((ahora - Date.parse(cerrada.junto)) / (op.quieta ? 1 : DURA_FOCO)) : 0;
  const rFoco = corteFoco ? recorrido(Date.parse(corteFoco)) : yaRecorrido;
  const lejos = Math.max(0, yaRecorrido - rFoco);
  const aprieta = lejos > ancho * FOCO_MAXIMO ? 1 - compartido * (1 - (ancho * FOCO_MAXIMO) / lejos) : 1;
  const lugarTu = op.lugarTu ?? 0.5;
  const xTu = ancho * lugarTu + compartido * lejos * aprieta * (1 - lugarTu);
  // En la línea completa, lo que queda a la derecha de la vista no se dibuja
  const hastaLaVista = op.completa && !op.hastaTi ? ancho - corrido + MARGEN_COMPLETA : Infinity;
  // Lo que nació entre el corte y el momento en que la página pintó al director ya va contigo: nace después de tu paso
  const corteMs = aqui ? Date.parse(aqui) : 0;
  const xDe = (t: string) => {
    const ms = Date.parse(t);
    const r = recorrido(saltoVisto !== null && ms > corteMs && ms < saltoVisto ? saltoVisto + dura : ms);
    const atras = r < rFoco ? lejos * aprieta + (rFoco - r) : (yaRecorrido - r) * aprieta;
    return Math.min(xTu, xTu - atras);
  };

  const onda = (x: number, f: number) => linea + Math.sin(x / 14 + f) * ONDA_ALTO;
  const y = (x: number, f: number, d: number) => n1(dentro(onda(x, f) + d, 3, alto - 3));
  // La onda sigue donde iba aunque se repinte: empieza a mitad de su vuelta, según la hora, al milisegundo (redondeada a
  // la décima, cada repintada la corría hasta medio décimo: con la línea repintándose seguido, temblaba; nmvvyrasktit)
  const empieza = `-${n3((ahora / 1000) % ONDA_DURA)}s`;
  const ondula = (d: string[]) => `<animate attributeName="d" dur="${ONDA_DURA}s" begin="${empieza}" repeatCount="indefinite" values="${d[0]};${d[1]};${d[0]}"/>`;
  const sube = (x: number, d: number) => `<animateTransform attributeName="transform" type="translate" dur="${ONDA_DURA}s" begin="${empieza}" repeatCount="indefinite" values="0 0;0 ${n1(y(x, Math.PI, d) - y(x, 0, d))};0 0"/>`;

  /** El desvío de una rama en x: sube hasta su altura al nacer y, si un director la recoge, vuelve hacia él. */
  const desvio = (t: Trazo, x: number) =>
    t.altura * suave((x - t.nace) / t.curva) * (t.junta ? 1 - t.avance * suave((x - (t.fin - JUNTA)) / JUNTA) : 1);
  /** El trazo de una rama, en las dos fases de la onda: más muestras donde se curva. */
  const camino = (t: Trazo): string[] => {
    const x0 = Math.max(xInicio, Math.min(t.nace, t.fin));
    const x1 = t.fin;
    const xs = new Set<number>(enRejilla(x0, x1));
    for (let k = 1; k < 8; k++) {
      xs.add(t.nace + (k * t.curva) / 8);
      if (t.junta) xs.add(t.fin - JUNTA + (k * JUNTA) / 8);
    }
    const orden = [...xs].filter((x) => x >= x0 && x <= x1).sort((a, b) => a - b);
    if (orden.length < 2) orden.push(x1);
    return FASES.map((f) => `M${orden.map((x) => `${n1(x)} ${y(x, f, desvio(t, x))}`).join(' L')}`);
  };

  // Los grupos: cada revisión de antes, la que el director junta ahora y lo que nació después, que va contigo
  const { recogidas, contigo } = gruposDeRamas(ramas, aqui);
  // Las de cada lado, parejas en todo el alto; al nacer otra, las de su lado se reacomodan mientras crece (nmvtv593wtit)
  const altoRamas = op.altoRamas ?? alto;
  const trazosDe = (rs: { t: string; c: ClaseRama; globo?: string; id?: string }[], fin: number, junta: boolean, avance: number): Trazo[] => {
    const n = rs.length;
    const nueva = n ? suave((ahora - (desdeDe[rs[n - 1].id ?? ''] ?? Date.parse(rs[n - 1].t))) / dura) : 1;
    return rs.map((r, i) => {
      const altura = i < n - 1 ? alturaDeRama(i, altoRamas, n - 1) + (alturaDeRama(i, altoRamas, n) - alturaDeRama(i, altoRamas, n - 1)) * nueva : alturaDeRama(i, altoRamas, n);
      return { c: r.c, nace: xDe(r.t), altura, fin, avance, junta, globo: r.globo, id: r.id, curva: CURVA * (esLento(Date.parse(r.t)) ? LENTO_EN_REVISION : 1) };
    });
  };
  const deRama = (r: Rama) => ({ t: r.cuando, c: r.clase, globo: r.globo, id: r.id });

  const pasadas: string[] = [];
  const conCabeza: Trazo[] = [];
  const marcas: { x: number; h?: RevisionDeLinea }[] = [];
  let cuantasPasadas = 0;
  for (const h of [...historia].reverse()) {
    const clave = claveDeRevision(h);
    const xa = xDe(clave);
    if (xa < xInicio) continue;
    const suyas = op.completa ? h.ramas : h.ramas.slice(-Math.max(0, MAX_PASADAS - cuantasPasadas));
    cuantasPasadas += suyas.length;
    if (xa <= hastaLaVista) marcas.push({ x: xa, h });
    trazosDe(suyas, xa, true, 1).forEach((t, i) => {
      if (xa - Math.max(xInicio, t.nace) < 1 || t.nace > hastaLaVista) return;
      const d = camino(t);
      // La que la respuesta llevó a una fase que aún no llega se ve tenue hasta su turno (pd_linea_completa)
      const f = suyas[i].f;
      pasadas.push(`<path class="lv-pasada lv-${t.c}${f && porVenir.has(f) ? ' lv-tenue' : ''}" d="${d[0]}">${ondula(d)}</path>`);
    });
  }
  // El director de la revisión en marcha: junta en un minuto y, ya juntas, las cabecitas giran a su alrededor
  const xDir = aqui ? xDe(aqui) : null;
  const juntado = aqui ? juntadoAl(aqui, ahora, op.quieta, op.revision?.desde) : 0;
  const girando = aqui !== null && juntado >= 1;
  const suyas = aqui ? trazosDe(recogidas.map(deRama), xDir!, true, juntado) : [];
  if (!girando) conCabeza.push(...suyas);
  conCabeza.push(...trazosDe(contigo.map(deRama), xTu, false, 0));
  if (op.revisado && !aqui && !historia.some((h) => h.junto === op.revisado)) {
    const xr = xDe(op.revisado);
    if (xr >= xInicio && !marcas.some((m) => Math.abs(m.x - xr) < 1)) marcas.push({ x: xr });
  }

  // Lo que dice cada cabecita va en su globo, que se abre al pasar sobre ella (abrirGlobo), no en un <title>: el del
  // navegador saldría encima del globo
  const globoDe = (t: Trazo) => esc(`${tx(NOMBRE_RAMA[t.c])}\n${t.globo ?? ''}`.trim());
  const ramasSvg = conCabeza.map((t) => {
    const d = camino(t);
    const dy = desvio(t, t.fin);
    const py = y(t.fin, 0, dy);
    return `<g class="lv-g lv-${t.c}"><g class="lv-n${t.junta ? ' lv-recogida' : ''}" data-rama="${t.c}"${t.id ? ` data-nota="${esc(t.id)}"` : ''}><path class="lv-rama" d="${d[0]}">${ondula(d)}</path><g class="lv-cabeza" data-globo="${globoDe(t)}"><g>${sube(t.fin, dy)}<circle class="lv-halo" cx="${n1(t.fin)}" cy="${py}" r="6"/><circle class="lv-punta" cx="${n1(t.fin)}" cy="${py}" r="2.6"/></g></g></g></g>`;
  }).join('');
  // Ya juntas, sus ramas llegan al director y sus cabecitas giran a su alrededor, sin globo: mientras giran no se abren
  // al pasar sobre ellas, para que el ratón llegue limpio al director (nota de voz nmvvcp89ttit)
  const juntasSvg = girando
    ? suyas.map((t) => {
      const d = camino(t);
      return `<g class="lv-g lv-${t.c}"><g class="lv-n lv-recogida lv-girando" data-rama="${t.c}"${t.id ? ` data-nota="${esc(t.id)}"` : ''}><path class="lv-rama" d="${d[0]}">${ondula(d)}</path></g></g>`;
    }).join('')
    : '';
  // Lo que pasó desde que apareció a la vista: su entrada, la salida de las cabecitas y su latido se cuentan desde ahí
  const desdeAqui = aqui ? ahora - (op.revision?.desde ?? Date.parse(aqui)) : 0;
  // Al juntarse, salen de él a su órbita, sin saltar a ella (DURA_SALIDA)
  const salida = op.quieta ? '' : unaVez(desdeAqui - DURA_CONVERGE, DURA_SALIDA, (dur, begin) =>
    `<animateTransform attributeName="transform" type="scale" dur="${dur}" begin="${begin}" fill="freeze" values="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.25 0.8 0.4 1"/>`);
  const orbita = girando && suyas.length
    ? `<g class="lv-orbita-sale">${salida}<g class="lv-orbita" style="animation-duration:${ORBITA_DURA}s;animation-delay:-${n3((desdeAqui / 1000) % ORBITA_DURA)}s">${suyas.map((t, i) => {
      const a = (2 * Math.PI * i) / suyas.length;
      const r = suyas.length > 8 && i % 2 ? 20 : 16;
      return `<g class="lv-g lv-${t.c}"${t.id ? ` data-nota="${esc(t.id)}"` : ''}><circle class="lv-punta lv-gira" cx="${n1(Math.cos(a) * r)}" cy="${n1(Math.sin(a) * r)}" r="2.2"/></g>`;
    }).join('')}</g></g>`
    : '';

  // Cada revisión, marcada en la línea donde juntó sus ramas; al pasar el ratón por ella, su informe en un globo, como el de
  // una cabecita: cuántas ramas abriste y qué pasó con ellas (pd_linea_informe). La de la revisión recién cerrada, que la
  // historia aún no trae, solo dice qué es
  const marcasSvg = marcas.map(({ x, h }) => {
    const dice = h ? ` data-globo="${esc(`${tx('linea.revisionMarca')}\n${textoDelInforme(informeDeRevision(h))}`)}"` : '';
    return `<g${dice} class="lv-revision">${h ? '' : `<title>${tx('linea.revisionMarca')}</title>`}<g>${sube(x, 0)}<circle cx="${n1(x)}" cy="${y(x, 0, 0)}" r="3.4"/></g></g>`;
  }).join('');

  // El director, el mismo personaje del director flotante, con su carita sonriente (cara.ts; nota del titular
  // nmvvx6o79tit, 31 de octubre de 2026), y su luz. Un clic en él abre lo que va haciendo (app.ts › pintarProgreso),
  // y si se le negó algo, lo dice en rojo. Va en la capa de encima, sobre un disco del color del fondo para que ni la
  // línea ni las ramas que llegan lo tapen, y late con un zoom mientras trabaja, para que se lo encuentre y se le dé clic
  // (nota de voz nmvttk603tit); el latido sigue donde iba aunque se repinte, como la onda
  const negados = op.revision?.negados ?? 0;
  const latido = aqui ? n3((desdeAqui / 1000) % LATIDO_DURA) : 0;
  // Su entrada: de 0 a ESCALA_REBOTE y de vuelta a 1, desde su centro (el punto de la línea donde queda), y de transparente a visible
  const entrada = op.quieta ? '' : unaVez(desdeAqui, DURA_ENTRADA, (dur, begin) =>
    `<animateTransform attributeName="transform" type="scale" dur="${dur}" begin="${begin}" fill="freeze" values="0;${ESCALA_REBOTE};1" keyTimes="0;0.55;1" calcMode="spline" keySplines="0.25 0.8 0.4 1;0.45 0 0.55 1"/><animate attributeName="opacity" dur="${dur}" begin="${begin}" fill="freeze" values="0;1;1" keyTimes="0;0.4;1"/>`);
  const directorSvg = xDir === null ? '' : `<g class="lv-director" data-progreso role="button" tabindex="0" aria-label="${tx('linea.directorAria')}"><title>${tx('linea.directorTitulo')}</title><g>${sube(xDir, 0)}<g transform="translate(${n1(xDir)} ${y(xDir, 0, 0)})"><g class="lv-dir-entra">${entrada}<g class="lv-dir-late" style="animation-duration:${LATIDO_DURA}s;animation-delay:-${latido}s">
<circle class="lv-dir-fondo" r="9.5"/>
<circle class="lv-dir-luz" r="13"/>
<g class="lv-dir-nucleo lv-dir-cara" transform="translate(-8.5 -9.2) scale(0.17)">${caraDentro('feliz')}</g>
${orbita}</g>${negados ? `<g class="lv-dir-aviso"><circle cx="7" cy="-8" r="4.6"/><text x="7" y="-6.3" text-anchor="middle">${negados > 9 ? '9+' : negados}</text></g>` : ''}
</g></g></g></g>`;

  // Tu lote de misiones, repartido hacia adelante: al entregar cada una, la línea corre hasta ella y llegas. Si no cabe,
  // sigue fuera del cuadro, y en la barra se arrastra hacia adelante para verlo
  const espacio = lote.length ? dentro((xMision - 10 - xTu) / lote.length, 8, 36) : 0;
  const hechas = lote.reduce((s, m) => s + (m.entregada ? suave((ahora - (desdeDe[`m:${m.id}`] ?? Date.parse(m.entregada))) / dura) : 0), 0);
  const xFin = Math.max(xMision, lote.length ? xTu + espacio * (lote.length - hechas) + 10 : 0);
  const loteSvg = lote.map((m, i) => {
    const x = xTu + espacio * (i + 1 - hechas);
    if (x <= xTu + 0.5) return '';
    return `<g class="lv-lote"><title>${esc(tx('linea.tuMision', { titulo: m.titulo }))}</title><g>${sube(x, 0)}<circle cx="${n1(x)}" cy="${y(x, 0, 0)}" r="2.8"/></g></g>`;
  }).join('');

  // Tú, el cubito con carita de «Qué es STL», al centro, sobre la línea
  const tu = `<g class="lv-tu"><title>${tx('linea.tuTitulo')}</title><g>${sube(xTu, 0)}<g transform="translate(${n1(xTu)} ${y(xTu, 0, 0)})">
${CUERPO_DE_TU}
</g></g></g>`;

  const cuantas = ramas.length;
  const dice = aqui
    ? tx(girando ? 'linea.diceJuntoYa' : 'linea.diceJunta', { ramas: tx('linea.ramas', { n: recogidas.length }), contigo: contigo.length ? `; ${tx('linea.contigo', { n: contigo.length })}` : '' })
    : cuantas
      ? tx('linea.diceSinRevision', { ramas: tx('linea.ramas', { n: cuantas }) })
      : tx('linea.diceUnida');
  const xFinLinea = Math.min(xTu, hastaLaVista);
  const lineaD = FASES.map((f) => `M${enRejilla(xInicio, xFinLinea).map((x) => `${n1(x)} ${y(x, f, 0)}`).join(' L')}`);
  const futuroD = FASES.map((f) => `M${[...Array(Math.ceil((xFin - 4 - xTu) / MUESTRA) + 1)].map((_, i) => Math.min(xFin - 4, xTu + i * MUESTRA)).map((x) => `${n1(x)} ${y(x, f, 0)}`).join(' L')}`);
  const ym = y(xFin, 0, 0);
  // Hasta dónde se puede arrastrar la cámara (nmvtu61hxtit): hacia atrás, hasta que lo más viejo que hay llega al
  // centro; hacia adelante, solo si algo del lote quedó fuera del cuadro
  const viejos = [...ramas.map((r) => r.cuando), ...historia.flatMap((h) => [claveDeRevision(h), ...h.ramas.map((r) => r.t)])].filter((t) => Number.isFinite(Date.parse(t)));
  const xViejo = Math.min(xTu, ...viejos.map(xDe));
  const atras = Math.max(0, n1((op.completa ? MARGEN_VIEJO : ancho / 2) - xViejo));
  const adelante = Math.max(0, n1(xFin - xMision));
  const puntosSvg = (op.puntos ?? []).map((p) => {
    const x = xDe(p.cuando);
    return x < xInicio || x > hastaLaVista ? '' : `<g>${sube(x, 0)}${p.html(n1(x), y(x, 0, 0))}</g>`;
  }).join('');
  // La línea completa siempre con su cámara, que vuelve sola sin rehacer el dibujo. Y sin el globo del navegador sobre todo
  // el dibujo: ahí, cada revisión tiene el suyo
  const conCamara = !!corrido || !!op.completa;
  return `<svg class="lv-dibujo${cuantas || aqui ? '' : ' lv-unida'}${op.quieta ? ' lv-congelada' : ''}" viewBox="0 0 ${n1(ancho)} ${n1(alto)}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${dice}" data-atras="${atras}" data-adelante="${adelante}">
${op.completa ? '' : `<title>${dice}</title>`}
<defs>${GRADIENTE_DE_TU}</defs>
${op.fondo ? svgEstrellas(ancho, alto, op.quieta ? 0 : yaRecorrido, ahora, op.quieta) : ''}${conCamara ? `<g class="lv-camara" transform="translate(${n1(corrido)} 0)">` : ''}
<path class="lv-halo-linea" d="${lineaD[0]}">${ondula(lineaD)}</path>
<path class="lv-linea" d="${lineaD[0]}">${ondula(lineaD)}</path>
<path class="lv-futuro" d="${futuroD[0]}">${ondula(futuroD)}</path>
${loteSvg}
${pasadas.join('')}
${marcasSvg}
${juntasSvg}
${ramasSvg}
<path class="lv-mision" d="M${n1(xFin)} ${n1(ym - 6)} l8 6 l-8 6 z"/>
${tu}
${puntosSvg}
${directorSvg}${conCamara ? '</g>' : ''}
</svg>`;
}

/** Dónde se pinta: la barra, con su tamaño fijo, y la franja del enfoque, con el ancho que tenga (el alto por unidad es el mismo). */
const CAJAS = ['linea-viva', 'linea-enfoque'] as const;
/** El alto del dibujo en la franja del enfoque, en unidades: con más ancho muestra más tiempo, no más grande. */
export const ALTO_FRANJA = 110;

/**
 * El alto del dibujo de la barra, en unidades: el de su caja, con su mismo ancho de siempre, para usar todo el alto que le
 * queda antes de apilar las ramas (nota de voz nmvtv593wtit); sin caja medida, el de siempre. Puro.
 */
export function altoDeLaBarra(w: number, h: number): number {
  return w > 0 && h > 0 ? Math.round(Math.max(ALTO_BARRA, (ANCHO_BARRA * h) / w)) : ALTO_BARRA;
}

/** Lo que se pinta ahora. */
let ultimo: { ramas: Rama[]; op: Omit<OpcionesLinea, 'ahora' | 'ancho' | 'alto' | 'quieta'>; raiz: Document } | null = null;
/** Lo último que recibió, como texto: si llega lo mismo, el dibujo que está a la vista no se rehace. */
let ultimaClave = '';
let reloj: ReturnType<typeof setTimeout> | null = null;

/**
 * Cada cuánto se repinta: mientras algo se mueve, seguido; si no, cada minuto, para que avances con el reloj. Mientras se
 * mueve, unas treinta veces por segundo: a 90 ms, la rama que nace subía a saltos, cuadro a cuadro (nota de voz del
 * titular nmvvyrasktit, 31 de octubre de 2026).
 */
export const CADA_MOVIENDO = 33;
const CADA_QUIETA = 60_000;
/** Mientras una cámara vuelve después de arrastrarla, el cuadro siguiente de la pantalla, que solo la corre (correrCamaras). */
let cuadro: { v: Window & typeof globalThis; id: number } | null = null;

/**
 * Cada caja se mide: cuando cambia de tamaño (la franja del enfoque, que aparece con él), se pinta otra vez. Sin esto, la
 * primera vez que se ponía el enfoque después de una revisión la franja quedaba vacía hasta ocultarla y mostrarla
 * (nmvtnl7c0tit): se pintaba cuando aún no tenía tamaño y nada la volvía a pintar hasta el minuto siguiente.
 */
let medidor: ResizeObserver | null = null;
const medidas = new WeakMap<Element, string>();

/**
 * El globo de una cabecita (nota de voz nmvtt33jctit): al pasar sobre ella se abre desde ahí con la nota entera (la
 * transcripción, si es de voz), y mientras está abierto la línea se queda quieta, para que la cabecita no se escape del
 * ratón. Se puede entrar en él para desplazarse; al salir de los dos, se cierra y la línea sigue desde la hora.
 */
let globo: HTMLElement | null = null;
let congelada = false;
/**
 * El reloj de la línea: la hora, menos lo que estuvo congelada mientras se leía un globo (nota de voz del titular
 * nmw2oyzjttit, 4 de noviembre de 2026). Con la hora de verdad, al cerrar el globo la cámara que volvía saltaba a donde
 * habría llegado si hubiera seguido; así sigue desde donde se detuvo. Mientras está congelada, el reloj no avanza; cuando
 * ya nada se mueve, lo descontado se olvida y vuelve a ser la hora (el salto de unos segundos en horas no se ve).
 */
let pausado = 0;
let congeladaEn: number | null = null;
const ahoraDeLinea = () => (congeladaEn ?? Date.now()) - pausado;
let cerrando: ReturnType<typeof setTimeout> | null = null;
const conGlobo = new WeakSet<Element>();
/** La nota entera de cada rama de ahora, por su id: el SVG lleva solo lo corto. */
const textos = new Map<string, string>();
/** Lo que creció la franja la última vez, para no tocar el CSS si no cambia. */
let crecio: number | null = null;
/** La entrada del director de la revisión en marcha. */
let vistaDirector: VistaDelDirector | null = null;
/** Los pasos que se le cuentan a lo recién llegado desde que esta página lo pintó (pasosVistos). */
let pasosDeAhora: PasosVistos | null = null;
/** Se guarda para esta pestaña: una recarga a mitad de la revisión no vuelve a dar su entrada. */
const CLAVE_VISTA_DIRECTOR = 'stl-vista-director';
function leerVistaDirector(v: (Window & typeof globalThis) | null): VistaDelDirector | null {
  try {
    const x = JSON.parse(v?.sessionStorage?.getItem(CLAVE_VISTA_DIRECTOR) ?? 'null') as VistaDelDirector | null;
    return x && typeof x.vez === 'string' && typeof x.desde === 'number' && typeof x.ultimo === 'number' ? x : null;
  } catch {
    return null;
  }
}
function guardarVistaDirector(v: (Window & typeof globalThis) | null, x: VistaDelDirector): void {
  try {
    v?.sessionStorage?.setItem(CLAVE_VISTA_DIRECTOR, JSON.stringify(x));
  } catch {
    // Sin dónde guardarla, una recarga la vuelve a dar: no es grave
  }
}
/**
 * La cámara de cada caja, si se arrastró (nmvtu61hxtit): cuánto se corrió, en unidades, y cuándo se soltó. Una por caja:
 * la barra y la franja del enfoque se ven en momentos distintos, y solo se corre la que se arrastró (nota de voz del
 * titular nmvvmggqgtit, 30 de octubre de 2026: moverlas juntas pedía el doble al navegador).
 */
type Mirada = { corrido: number; soltada: number | null };
const miradas = new Map<string, Mirada>();
const miradaDe = (id: string): Mirada => miradas.get(id) ?? { corrido: 0, soltada: null };
/** Mientras se aprieta el director, quieta: si se repintara entre apretar y soltar, el clic se perdería (nmvttk603tit). */
let apretado = false;

/** Para las pruebas: olvida lo pintado. */
export function olvidarLineaViva(): void {
  pararReloj();
  ultimo = null;
  ultimaClave = '';
  medidor?.disconnect();
  medidor = null;
  congelada = false;
  pausado = 0;
  congeladaEn = null;
  crecio = null;
  vistaDirector = null;
  pasosDeAhora = null;
  globo = null;
  miradas.clear();
  apretado = false;
}

/**
 * La barra se arrastra de lado para mirar el pasado de la línea, y hacia adelante si algo quedó fuera del cuadro
 * (nmvtu61hxtit): mientras se arrastra, la cámara sigue al puntero; al soltar, espera dos segundos y vuelve despacio a
 * ti (corridoAl). Un clic sin arrastrar sigue siendo un clic: el director abre lo que va haciendo.
 */
function arrastrable(caja: HTMLElement, v: Window & typeof globalThis): void {
  let desde: { x: number; corrido: number; id: number } | null = null;
  let arrastrando = false;
  caja.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const m = miradaDe(caja.id);
    desde = { x: e.clientX, corrido: corridoAl(m.corrido, m.soltada, ahoraDeLinea()), id: e.pointerId };
    arrastrando = false;
  });
  caja.addEventListener('pointermove', (e) => {
    if (!desde || e.pointerId !== desde.id) return;
    const dx = e.clientX - desde.x;
    if (!arrastrando && Math.abs(dx) < 4) return;
    if (!arrastrando) {
      arrastrando = true;
      apretado = false;
      caja.setPointerCapture?.(e.pointerId);
      caja.classList.add('arrastrando');
    }
    const svg = caja.querySelector('svg');
    // Las unidades del dibujo por cada píxel: en la barra, su ancho fijo; en la franja del enfoque, el ancho que tenga
    const porPixel = (Number(svg?.getAttribute('viewBox')?.split(' ')[2]) || ANCHO_BARRA) / Math.max(1, caja.clientWidth);
    const m = miradaDe(caja.id);
    const atras = Number(svg?.getAttribute('data-atras') ?? 0) + Math.max(0, m.corrido);
    const adelante = Number(svg?.getAttribute('data-adelante') ?? 0) - Math.min(0, m.corrido);
    miradas.set(caja.id, { corrido: dentro(desde.corrido + dx * porPixel, -adelante, atras), soltada: null });
    // Solo la que se arrastra: la otra no se movió
    latir(caja.id);
  });
  const soltar = (e: PointerEvent) => {
    if (!desde || e.pointerId !== desde.id) return;
    desde = null;
    if (!arrastrando) return;
    arrastrando = false;
    caja.classList.remove('arrastrando');
    miradas.set(caja.id, { ...miradaDe(caja.id), soltada: ahoraDeLinea() });
    v.setTimeout(() => latir(), 0);
  };
  caja.addEventListener('pointerup', soltar);
  caja.addEventListener('pointercancel', soltar);
  // El clic que sigue a un arrastre no abre nada
  caja.addEventListener('click', (c) => {
    const soltada = miradaDe(caja.id).soltada;
    if (soltada !== null && ahoraDeLinea() - soltada < 400) c.stopPropagation();
  }, { capture: true });
}

/** Al apretar el director, la línea espera a que se suelte para repintarse: así el clic le llega a él. */
function apretable(caja: HTMLElement, v: Window & typeof globalThis): void {
  caja.addEventListener('pointerdown', (e) => {
    if ((e.target as Element).closest?.('[data-progreso]')) apretado = true;
  });
  const soltar = () => {
    if (!apretado) return;
    // Después del clic, que llega justo tras soltar
    v.setTimeout(() => {
      apretado = false;
      latir();
    }, 0);
  };
  caja.addEventListener('pointerup', soltar);
  caja.addEventListener('pointercancel', soltar);
  caja.addEventListener('pointerleave', soltar);
}

/**
 * Dónde y cómo va el globo de una cabecita: del lado (arriba o abajo) con más espacio, nacido de ella y centrado en ella
 * sin salirse de la pantalla; tan ancho como pida el texto, tan alto como deje ese lado (si no cabe, se desplaza por
 * dentro) y con la letra más grande que quepa, entre 13 y 19 píxeles. Puro.
 */
export function lugarDelGlobo(cabeza: { x: number; y: number; ancho: number; alto: number }, vista: { ancho: number; alto: number }, largo: number) {
  const margen = 12;
  const arriba = cabeza.y - margen;
  const abajo = vista.alto - (cabeza.y + cabeza.alto) - margen;
  const haciaArriba = arriba >= abajo;
  const maxAlto = Math.max(80, (haciaArriba ? arriba : abajo) - 8);
  const ancho = Math.round(dentro(Math.sqrt(Math.max(1, largo)) * 24, 240, Math.min(620, vista.ancho - 2 * margen)));
  const letra = Math.round(dentro(Math.sqrt((ancho * maxAlto * 0.5) / (Math.max(1, largo) * 0.62)), 13, 19));
  const centro = cabeza.x + cabeza.ancho / 2;
  const izquierda = Math.round(dentro(centro - ancho / 2, margen, vista.ancho - margen - ancho));
  return {
    izquierda, ancho, letra, maxAlto: Math.round(maxAlto), haciaArriba,
    // Su borde, a 8 píxeles de la cabecita; y de dónde nace, para que crezca desde ella
    borde: Math.round(haciaArriba ? vista.alto - cabeza.y + 8 : cabeza.y + cabeza.alto + 8),
    origen: Math.round(dentro(centro - izquierda, 12, ancho - 12)),
  };
}

/**
 * El informe de una revisión, en palabras, para su globo (pd_linea_informe): cuántas ramas abriste y, debajo, cuántas juntó
 * el director en la línea, cuántas esperan su fase y cuántas cerró; o, si la historia no lo guardó, que no hay detalle.
 * Lo usan la barra, el modo enfoque y la línea en grande. Pura.
 */
export function textoDelInforme(i: InformeDeRevision): string {
  const abriste = tx('linea.informeAbriste', { n: i.abiertas });
  if ('sinDetalle' in i) return `${abriste}\n${tx(i.sinDetalle === 'antes' ? 'linea.informeAntes' : 'linea.informeSinDetalle')}`;
  return `${abriste}\n${tx('linea.informeCuentas', { juntadas: i.juntadas, esperan: i.esperan, cerradas: i.cerradas })}`;
}

/**
 * Quieta mientras se lee un globo: sin repintar, con las animaciones del SVG detenidas y con su reloj quieto (también la
 * cámara que vuelve); al soltarla, sigue desde donde se detuvo, sin saltar a donde iría (nmw2oyzjttit).
 */
function congelar(si: boolean): void {
  if (congelada === si) return;
  congelada = si;
  if (si) congeladaEn = Date.now();
  else if (congeladaEn !== null) {
    pausado += Date.now() - congeladaEn;
    congeladaEn = null;
  }
  const u = ultimo;
  if (!u) return;
  if (!si) {
    latir();
    return;
  }
  pararReloj();
  for (const id of CAJAS) (u.raiz.getElementById(id)?.querySelector('svg') as SVGSVGElement | null)?.pauseAnimations?.();
  // Las estrellas, el latido y la órbita van con CSS, que pauseAnimations no detiene
  for (const id of CAJAS) u.raiz.getElementById(id)?.querySelector('svg')?.classList?.add('lv-congelada');
}
/** Para las pruebas: lo que hacen abrir y cerrar el globo con la línea. */
export const congelarLineaViva = (si: boolean): void => congelar(si);

function abrirGlobo(cabeza: Element, v: Window & typeof globalThis): void {
  if (cerrando !== null) v.clearTimeout(cerrando);
  cerrando = null;
  congelar(true);
  const doc = cabeza.ownerDocument;
  const [nombre, ...corto] = (cabeza.getAttribute('data-globo') ?? '').split('\n');
  const texto = textos.get(cabeza.closest('[data-nota]')?.getAttribute('data-nota') ?? '') ?? corto.join('\n');
  if (!globo?.isConnected) {
    globo = doc.createElement('div');
    globo.className = 'lv-globo';
    globo.setAttribute('role', 'tooltip');
    globo.addEventListener('pointerenter', () => {
      if (cerrando !== null) v.clearTimeout(cerrando);
      cerrando = null;
    });
    globo.addEventListener('pointerleave', (e) => {
      if (!(e.relatedTarget as Element | null)?.closest?.('[data-globo]')) soltarGlobo(v);
    });
    doc.body.append(globo);
  }
  globo.innerHTML = `<b>${esc(nombre)}</b>${texto ? `<p>${esc(texto)}</p>` : ''}`;
  const r = cabeza.getBoundingClientRect();
  const l = lugarDelGlobo({ x: r.left, y: r.top, ancho: r.width, alto: r.height }, { ancho: v.innerWidth, alto: v.innerHeight }, nombre.length + texto.length);
  Object.assign(globo.style, {
    left: `${l.izquierda}px`, width: `${l.ancho}px`, maxHeight: `${l.maxAlto}px`, fontSize: `${l.letra}px`,
    top: l.haciaArriba ? '' : `${l.borde}px`, bottom: l.haciaArriba ? `${l.borde}px` : '',
  });
  globo.style.setProperty('--origen-x', `${l.origen}px`);
  globo.classList.toggle('hacia-abajo', !l.haciaArriba);
  globo.scrollTop = 0;
  globo.hidden = false;
}

/** Se cierra un momento después de salir, por si el ratón va hacia el globo para desplazarse en él. */
function soltarGlobo(v: Window & typeof globalThis): void {
  if (cerrando !== null) v.clearTimeout(cerrando);
  cerrando = v.setTimeout(() => {
    cerrando = null;
    if (globo) globo.hidden = true;
    congelar(false);
  }, 180) as unknown as ReturnType<typeof setTimeout>;
}

/** Cada caja escucha el ratón una vez, por delegación: lo que se repinta adentro no pierde el globo. */
function escucharCabezas(caja: HTMLElement, v: Window & typeof globalThis): void {
  if (conGlobo.has(caja) || typeof caja.addEventListener !== 'function') return;
  conGlobo.add(caja);
  apretable(caja, v);
  // La barra y la franja del modo enfoque se arrastran igual y vuelven igual (pregunta del titular nmvvii0vwtit, 30 de
  // octubre de 2026), cada una con su cámara (nmvvmggqgtit)
  arrastrable(caja, v);
  const fuera = (a: EventTarget | null) => !(a instanceof v.Node && (globo?.contains(a) || (a as Element).closest?.('[data-globo]')));
  caja.addEventListener('pointerover', (e) => {
    const cabeza = (e.target as Element).closest?.('[data-globo]');
    // Solo al pasar por la cabecita: las ramas no tienen clic ni otro juego (nota de voz del titular nmw2ng9jetit)
    if (cabeza) abrirGlobo(cabeza, v);
  });
  caja.addEventListener('pointerout', (e) => {
    if ((e.target as Element).closest?.('[data-globo]') && fuera(e.relatedTarget)) soltarGlobo(v);
  });
  caja.addEventListener('pointerleave', (e) => {
    if (globo && !globo.hidden && fuera(e.relatedTarget)) soltarGlobo(v);
  });
}

/**
 * Pinta la línea viva donde esté (la barra y, en el enfoque, su franja) y la mantiene al día: mientras una rama nace, el
 * director junta o llegas a una misión, cada fracción de segundo; si no, cada minuto (lo demás lo mueve el mismo SVG).
 */
export function pintarLineaViva(ramas: Rama[], raiz: Document = document, op: NonNullable<typeof ultimo>['op'] = {}): void {
  // Con lo mismo que ya está dibujado, no se rehace: marcar un paso o un aviso repintan el Studio, y el gráfico seguía
  // naciendo de nuevo en cada uno (nota de voz nmvvdc2f4tit). El reloj lo sigue moviendo
  const clave = JSON.stringify([ramas, op]);
  const dibujada = (id: string) => {
    const el = raiz.getElementById(id);
    return !el || !!el.innerHTML || !el.clientWidth;
  };
  const igual = clave === ultimaClave && raiz === ultimo?.raiz && reloj !== null && CAJAS.every(dibujada);
  ultimo = { ramas, op, raiz };
  ultimaClave = clave;
  textos.clear();
  for (const r of ramas) if (r.texto) textos.set(r.id, r.texto);
  if (!igual) latir();
}

/** La pinta otra vez con lo último que recibió: cuando su caja cambia de tamaño (al poner el enfoque, ocultar la franja o cambiar la ventana). */
export function repintarLineaViva(): void {
  latir();
}

function medir(cajas: HTMLElement[], v: (Window & typeof globalThis) | null): void {
  const Medidor = v?.ResizeObserver;
  if (typeof Medidor !== 'function') return;
  medidor ??= new Medidor((cambios) => {
    // Solo si de verdad cambió de tamaño: pintar adentro no la vuelve a medir
    const cambio = cambios.some((c) => medidas.get(c.target) !== `${(c.target as HTMLElement).clientWidth}x${(c.target as HTMLElement).clientHeight}`);
    if (cambio) latir();
  });
  for (const el of cajas) {
    if (medidas.has(el)) continue;
    medidas.set(el, '');
    medidor.observe(el);
  }
}

/** Pinta las estrellas del menú una vez por tamaño: su animación sigue sola, y rehacerlas en cada latido la haría empezar de nuevo. */
function pintarCielo(raiz: Document, ahora: number, quieta: boolean): void {
  const el = raiz.getElementById('cielo-lateral');
  if (!el?.clientWidth || !el.clientHeight) return;
  const clave = `${el.clientWidth}x${el.clientHeight}|${quieta}`;
  if (el.dataset.dibujado === clave) return;
  el.dataset.dibujado = clave;
  el.innerHTML = svgCieloLateral(el.clientWidth, el.clientHeight, ahora, quieta);
}

/** Pinta las cajas (con `solo`, únicamente esa: la que se está arrastrando) y deja pedido lo que la vuelve a pintar. */
function latir(solo?: string): void {
  pararReloj();
  const u = ultimo;
  // Mientras se lee un globo o se aprieta el director, quieta: lo nuevo se pinta al soltarlo
  if (!u || congelada || apretado) return;
  const todas = CAJAS.map((id) => u.raiz.getElementById(id)).filter((el): el is HTMLElement => !!el);
  const cajas = solo ? todas.filter((el) => el.id === solo) : todas;
  if (!cajas.length) return;
  const v = (cajas[0].ownerDocument?.defaultView ?? null) as (Window & typeof globalThis) | null;
  medir(cajas, v);
  if (v) for (const el of cajas) escucharCabezas(el, v);
  const quieta = !!v?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const ahora = ahoraDeLinea();
  pintarCielo(u.raiz, ahora, quieta);

  // La entrada del director se cuenta desde que esta pestaña lo pinta, y lo que no pinta no se le descuenta (vistaDelDirector)
  const viva = u.op.revision ?? null;
  if (viva) {
    const vez = viva.vez ?? viva.aqui;
    const antes = vistaDirector ?? leerVistaDirector(v);
    vistaDirector = vistaDelDirector(antes, vez, ahora);
    if (vistaDirector.desde !== antes?.desde || vez !== antes?.vez) guardarVistaDirector(v, vistaDirector);
  } else vistaDirector = null;
  const desde = viva ? vistaDirector!.desde : undefined;
  // El paso de lo recién llegado, igual: desde que esta página lo pinta (pasosVistos)
  pasosDeAhora = pasosVistos(pasosDeAhora, [...u.ramas, ...(u.op.lote ?? []).filter((m) => m.entregada).map((m) => ({ id: `m:${m.id}`, cuando: m.entregada }))], ahora);
  const desdeDe = Object.fromEntries([...pasosDeAhora.enMarcha].map(([id, m]) => [id, m.desde]));

  // La franja del enfoque crece hacia arriba antes de apilar las cabecitas, y vuelve a su alto cuando se juntan
  // (nmvttbn0otit): lo que crece va en --franja-crece, y el CSS lo corta con lo que deja la pantalla
  const crece = altoParaRamas(cabezasALaVez(u.ramas, viva?.aqui ?? null, ahora, quieta, desde)) - ALTO_FRANJA;
  const estilo = (u.raiz as Partial<Document>).documentElement?.style;
  if (estilo && crece !== crecio) {
    crecio = crece;
    estilo.setProperty('--franja-crece', `${crece}px`);
  }

  // Se mueve mientras el director junta, mientras una rama acaba de nacer, mientras llegas a una misión entregada,
  // mientras el enfoque vuelve a ti al cerrarse una revisión y mientras la cámara de la barra vuelve después de arrastrarla
  const reciente = (iso?: string, dura = DURA_PASO) => !!iso && ahora - Date.parse(iso) < dura;
  // Lo que sigue corrida cada cámara; la que ya volvió se olvida
  const corridoDe = (id: string) => {
    const m = miradaDe(id);
    return quieta ? (m.soltada === null ? m.corrido : 0) : corridoAl(m.corrido, m.soltada, ahora);
  };
  for (const id of CAJAS) if (miradas.get(id)?.soltada != null && !corridoDe(id)) miradas.delete(id);
  // La vuelta no cuenta como movimiento del reloj: la lleva el cuadro de la pantalla, sin rehacer el dibujo (correrCamaras)
  const moviendo = !quieta && (
    (!!viva && ahora - desde! < DURA_CONVERGE + DURA_PASO)
    || pasosDeAhora.enMarcha.size > 0
    || u.ramas.some((r) => reciente(r.cuando))
    || (u.op.lote ?? []).some((m) => reciente(m.entregada))
    || (u.op.historia ?? []).some((h) => reciente(h.junto, DURA_FOCO)));
  // Ya quieta y sin una cámara corrida, lo descontado por los globos se olvida: el reloj vuelve a ser la hora
  if (!moviendo && !miradas.size) pausado = 0;

  for (const el of cajas) {
    const enFranja = el.id === 'linea-enfoque';
    const corrido = corridoDe(el.id);
    // En la barra, todo el alto que le queda (nmvtv593wtit): el dibujo toma su forma, con el mismo ancho en unidades
    const pintar = (w: number, h: number) => {
      // En la franja, una unidad por píxel de alto (al crecer, más espacio entre las cabecitas, no más grande) y su fondo de espacio
      const alto = Math.max(ALTO_FRANJA, h);
      const tam = enFranja ? { alto, ancho: Math.max(ANCHO_BARRA, (alto * w) / h), fondo: true, corrido } : { alto: altoDeLaBarra(w, h), fondo: true, corrido };
      el.innerHTML = svgLineaViva(u.ramas, { ...u.op, ...tam, ahora, quieta, desdeDe, revision: viva ? { ...viva, desde } : viva });
      if (quieta) (el.querySelector('svg') as SVGSVGElement | null)?.pauseAnimations?.();
    };
    const w = el.clientWidth;
    const h = el.clientHeight;
    medidas.set(el, `${w}x${h}`);
    // Oculta, la franja guarda su dibujo: al volver el enfoque está ahí desde el primer cuadro, sin un hueco (nmvvdc2f4tit)
    if (enFranja && (!w || !h)) continue;
    pintar(w, h);
    // Pintar la barra le da su tamaño: si cambió, se pinta otra vez con él, y se anota, para no repintarla por eso
    if (!enFranja && (el.clientWidth !== w || el.clientHeight !== h)) pintar(el.clientWidth, el.clientHeight);
    medidas.set(el, `${el.clientWidth}x${el.clientHeight}`);
  }
  // Mientras una cámara vuelve, en cada cuadro de la pantalla, como al arrastrarla: con el reloj de 90 ms daba unos once
  // saltos por segundo, y se veía cuadro a cuadro (pedido pd_linea_regreso_suave; nota de voz del titular nmvv94nzbtit)
  if (!quieta && CAJAS.some((id) => regresa(id)) && typeof v?.requestAnimationFrame === 'function') cuadro = { v, id: v.requestAnimationFrame(() => correrCamaras()) };
  // La que espera para volver, empieza justo a su hora
  const empieza = Math.min(...CAJAS.map((id) => miradas.get(id)).flatMap((m) => (m?.soltada != null && ahora - m.soltada < ESPERA_REGRESO ? [m.soltada + ESPERA_REGRESO - ahora] : [])));
  if (typeof v?.setTimeout === 'function') reloj = v.setTimeout(latir, Math.min(moviendo ? CADA_MOVIENDO : CADA_QUIETA, empieza)) as unknown as ReturnType<typeof setTimeout>;
}

/**
 * La vuelta, cuadro a cuadro: solo se corre el grupo de la cámara (lv-camara) de cada caja que vuelve, sin rehacer el
 * dibujo, así la onda sigue ondulando igual que mientras se arrastra (nota de voz del titular nmvvmm2rntit: al rehacerlo
 * en cada cuadro, su animación volvía a empezar y se veía detenida). Al llegar, se pinta una vez, ya sin cámara.
 */
function correrCamaras(): void {
  cuadro = null;
  const u = ultimo;
  if (!u || congelada || apretado) return;
  const ahora = ahoraDeLinea();
  let v: (Window & typeof globalThis) | null = null;
  for (const id of CAJAS) {
    if (!regresa(id)) continue;
    const el = u.raiz.getElementById(id);
    const m = miradaDe(id);
    const corrido = corridoAl(m.corrido, m.soltada, ahora);
    const grupo = el?.querySelector('g.lv-camara');
    if (!corrido || !grupo) return latir();
    grupo.setAttribute('transform', `translate(${n1(corrido)} 0)`);
    v ??= (el!.ownerDocument?.defaultView ?? null) as (Window & typeof globalThis) | null;
  }
  if (v && typeof v.requestAnimationFrame === 'function') cuadro = { v, id: v.requestAnimationFrame(() => correrCamaras()) };
}

/** Detiene lo que la iba a pintar otra vez: el reloj y el cuadro pedido. */
function pararReloj(): void {
  if (reloj !== null) clearTimeout(reloj);
  reloj = null;
  if (cuadro) cuadro.v.cancelAnimationFrame?.(cuadro.id);
  cuadro = null;
}

/** ¿La cámara de esa caja vuelve a ti ahora, después de soltarla? Entonces se corre en cada cuadro (correrCamaras). */
function regresa(id: string): boolean {
  const m = miradas.get(id);
  return !!m && m.corrido !== 0 && m.soltada !== null && ahoraDeLinea() - m.soltada >= ESPERA_REGRESO;
}
