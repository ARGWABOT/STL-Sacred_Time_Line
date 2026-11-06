// El recorrido en 3D de «Qué es STL», su primer tramo (pd_recorrido_3d, 3 de noviembre de 2026): la estación 1 («Qué es
// STL»: tres actores, el desarrollador en la línea, y el Studio (con el director dentro) y el modelo en alto, con el ciclo
// de lo que le entregas y las misiones que pasan), la línea
// del tiempo como camino hasta la estación 2 y la estación 2 («¿Te ha pasado…?»: los seis grandes problemas giran
// despacio alrededor de la línea, como un anillo, cada uno un ícono 3D con su globo al pasar el ratón; al elegir uno, su
// reproductor crece a la izquierda del anillo, hasta donde deja la pantalla, con sus mandos adentro, y se cierra solo 4 s
// después de terminar). «Cómo funciona» y «Lo que ya trae» salieron del recorrido: repetían lo que ya cuentan la estación
// 1 y las soluciones de la 2 (notas de voz nmw3xje22tit, nmw40cp3jtit y nmw40fizktit). Lo aprendido, en la skill
// «sitio-3d-scroll»: un escenario fijo detrás, el scroll convertido en el avance de la cámara y suavizado en cada cuadro, y
// el texto siempre en HTML. Con lo que pidió el titular al verlo, en dos vueltas: sin estrellas, fragmentos ni postes, la
// cámara más lenta, las bolitas del camino con los colores de cada tipo de nota y la animación de la estación 1 en
// grande, sin tapar el menú. Sin WebGL, las estaciones se leen de corrido y lo demás (el menú, los problemas
// con su respuesta en el mismo lugar y la animación en grande) funciona igual; con movimiento reducido, la cámara salta de
// estación en estación y nada se anima.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const ORO = '#f5d27a', LUZ = '#fff6d8', LINEA = '#ffcf5a', MORADO = '#b9a3ff', CIAN = '#5ad1ff', ROJO = '#ff6b8a';
const VERDE = '#6fe3a1', MODELO = '#c5d2e6', NOCHE = '#07090f', NARANJA = '#ffb36b', AMARILLO_TU = '#ffd98a';
// (Los colores de cada tipo de nota, COLOR_TIPO, viven más abajo, con los dibujos 2D que también los usan.)
// Los rótulos de la estación 1 por idioma: la página es en español y viene una versión en inglés (una sola página con
// «ES · EN»); el idioma sale de <html lang> (nota de voz nmw1c3q68tit). Los tipos de pedido llevan el nombre de su tipo
// en el Studio: falla, idea, ajuste, pregunta y respuesta. «pasado» es el título de la estación 2
const TEXTOS = {
  es: { dev: 'Desarrollador', estudio: 'Estudio', director: 'Director', modelo: 'Modelo', mision: 'Misión', falla: 'Error', idea: 'Idea', ajuste: 'Ajuste', pregunta: 'Petición', respuesta: 'Comentario', pasado: '7 problemas de desarrollar por chat que STL resuelve muy bien', visor: '¿Qué es STL?: <span>El guardrail donde más hacía falta, en el Dev</span>' },
  en: { dev: 'Dev', estudio: 'Studio', director: 'Director', modelo: 'Model', mision: 'Mission', falla: 'Bug', idea: 'Idea', ajuste: 'Tweak', pregunta: 'Request', respuesta: 'Comment', pasado: '7 problems of developing through chat that STL solves really well', visor: 'What is STL?: <span>The guardrail where it was needed most, in Dev</span>' },
};
const T = TEXTOS[(document.documentElement.lang || 'es').toLowerCase().startsWith('en') ? 'en' : 'es'];
const EN = (document.documentElement.lang || 'es').toLowerCase().startsWith('en');
// El título corto de cada gran problema, el que sale en el globo de su ícono: dos palabras (nota de voz nmw40cp3jtit); en
// español, el data-corto de la página; en inglés, su equivalente natural
const TITULOS_CORTOS_EN = ['Scattered attention', 'Incomplete messages', 'Lost thread', 'Long answers', 'Forgetful model', 'No internet', 'Typing fatigue'];
// La línea de la estación 2 sale del diccionario, también en la página en inglés
const tituloDos = document.querySelector('[data-titulo-dos]');
if (tituloDos) tituloDos.textContent = T.pasado;
// Y el título de la animación de la estación 1, arriba a la derecha de su visor (nmw479zmetit)
const tituloVisor = document.querySelector('[data-titulo-visor]');
if (tituloVisor) tituloVisor.innerHTML = T.visor;
// Cuánto de la distancia que le falta recorre la cámara en cada cuadro. Fue 0,085, luego 0,03 y ahora la mitad, 0,015: el
// cambio entre estaciones mareaba (nota de voz nmw17rx07tit)
const SUAVIZADO = 0.015;

// ── En un teléfono (o una tablet en vertical), una cubierta recomienda verlo en un computador o en una tablet en
// horizontal: las animaciones no se entienden en una pantalla angosta (nota de voz nmw17l49mtit). Se puede seguir igual
document.querySelector('[data-cerrar-cubierta]')?.addEventListener('click', () => document.getElementById('cubierta-movil')?.classList.add('cerrada'));

const lienzo = document.getElementById('mundo');
const estaciones = [...document.querySelectorAll('.estacion')];
const enlaces = [...document.querySelectorAll('.menu a')];
const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
const movil = matchMedia('(max-width: 900px), (pointer: coarse)').matches;
// Para revisar una estación sin desplazarse (?ver=2): la muestra fija, con su tarjeta. Sirve para capturarla sin pantalla
// (desplazar la página deja la captura en blanco) y para mostrar una sola estación.
const verTexto = new URLSearchParams(location.search).get('ver');
// La imagen al compartir el enlace (pd_imagen_compartir; nmw2nl736tit, nmw2p52extit): con ?compartir, la portada quieta en el
// momento en que el director habla con el modelo, sin rótulos ni ningún texto encima, para capturarla (mirar.ts --webgl)
const compartir = new URLSearchParams(location.search).has('compartir');
const MOMENTO_COMPARTIR = 11.2;
// El video corto de la difusión (pd_voz_video; docs/difusion/video-corto.js): con ?video, la página se vuelve el video,
// con la cámara fija en la estación 1, que sigue animándose mientras se ve
const enVideo = new URLSearchParams(location.search).has('video');
const ganchoVideo = {};
const fijo = compartir ? 0 : enVideo ? 1 : verTexto === null ? null : Math.max(0, Math.min(estaciones.length, Math.round(Number(verTexto)) || 0));

// ── «¿Te ha pasado…?»: cada problema abierto se marca con su ✓ (t_decide_cierre_problemas); la cuenta «Abriste N de 6»
// salió, con la tarjeta (nota de voz nmw40cp3jtit)
const problemas = [...document.querySelectorAll('.problema')];
const resueltos = new Set();
const alResolver = [];
function marcarVisto(i) {
  if (resueltos.has(i) || !problemas[i]) return;
  resueltos.add(i);
  problemas[i].classList.add('visto');
  alResolver.forEach((f) => f(i));
}
problemas.forEach((d, i) => d.addEventListener('toggle', () => { if (d.open) marcarVisto(i); }));

// ── La animación en grande: casi toda la pantalla, sin tapar el menú de la derecha. Esc, su botón o el desplazamiento la
// cierran, y la persona queda donde estaba en el recorrido (no se mueve el scroll)
const visor = document.getElementById('visor');
const visorIframe = visor?.querySelector('iframe');
let abridor = null;
const visorAbierto = () => !!visor && !visor.hidden;
function abrirVisor(desde) {
  if (!visor || !visorIframe) return;
  abridor = desde;
  if (!visorIframe.getAttribute('src')) visorIframe.setAttribute('src', visorIframe.dataset.src);
  visor.hidden = false;
  visor.querySelector('[data-cerrar-visor]')?.focus({ preventScroll: true });
}
function cerrarVisor() {
  if (!visorAbierto()) return false;
  visor.hidden = true;
  visorIframe.removeAttribute('src');   // se detiene al cerrarla; la pequeña sigue en su estación
  abridor?.focus?.({ preventScroll: true });
  return true;
}
document.querySelectorAll('[data-ver-animacion]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); abrirVisor(a); }));
visor?.querySelector('[data-cerrar-visor]')?.addEventListener('click', cerrarVisor);
// ?animacion: la abre en grande desde el principio, para revisarla o capturarla en el tamaño en que se ve (nmw40vdvitit)
if (new URLSearchParams(location.search).has('animacion')) abrirVisor(null);
// El recuadro de un problema del 3D se cierra con lo mismo: lo conecta iniciar() cuando hay mundo
let cerrarPopup = () => false;
addEventListener('keydown', (e) => { if (e.key === 'Escape' && (cerrarVisor() || cerrarPopup())) e.preventDefault(); });
addEventListener('wheel', (e) => { if (cerrarVisor() || cerrarPopup()) e.preventDefault(); }, { passive: false });
addEventListener('touchmove', () => { cerrarVisor(); cerrarPopup(); }, { passive: true });
enlaces.forEach((a) => a.addEventListener('click', cerrarVisor));

// ── El menú: los seis nombres a la vista, con el de la estación en que se está resaltado (t_decide_menu_estaciones)
function resaltar(id) {
  enlaces.forEach((a) => {
    const es = a.getAttribute('href') === `#${id}`;
    a.classList.toggle('actual', es);
    if (es) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
  });
}
const vigia = new IntersectionObserver((vistas) => vistas.forEach((v) => { if (v.isIntersecting) resaltar(v.target.id); }), { rootMargin: '-48% 0px -48% 0px' });
estaciones.forEach((e) => vigia.observe(e));

function hayWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

// ── Las mini animaciones de los problemas, en 2D y con los MISMOS actores de la estación 1 (nota de voz del 5 de noviembre):
// el desarrollador (el cubo amarillo con su sonrisa y su luz tibia), el Studio (el cubo morado translúcido con el director
// dentro: el cubo blanco con el visor oscuro y su sonrisa de luz cian), el modelo (el cubo gris azulado con su carita) y los
// íconos de cada tipo de nota (error, idea, ajuste, petición y comentario), con sus colores del Studio. Los dibujan unas
// pocas funciones compartidas (actorDev, actorStudio, actorDirector, actorModelo, iconoNota, placaMision), que repiten
// las formas y los colores con que la estación 1 los arma en la función iniciar; la línea, dorada.
// Los colores de cada tipo de nota, los mismos del Studio (estudio/src/estilos.css › --lv-respuesta, --lv-ajuste…): las
// bolitas del camino, lo que le entregas al Studio en la estación 1 y los íconos 2D de las animaciones los llevan (nota
// de voz nmw17rx07tit)
const COLOR_TIPO = { respuesta: '#f5d27a', ajuste: '#7fe0d6', idea: '#f7a8d8', falla: '#ff6b8a', pregunta: '#c9b8ff', eleccion: '#7fb2ff', hazlo: '#ffb27a', entrega: '#6fe3a1' };
// Los íconos de la estación 2, de un solo color con el blanco, con la paleta de las notas de la estación 1 (nota de voz del
// titular nmw46qjootit): uno distinto por problema, en el orden de la estación; antes de tocarlos, todos en gris. El séptimo,
// el micrófono del dictado, va en el verde de las entregas, en un tono más claro que el de «Con STL» para que no se
// confundan (nmw4it925tit)
const VERDE_DICTADO = '#b4f5cf';
const COLOR_PROBLEMA = [COLOR_TIPO.idea, COLOR_TIPO.ajuste, COLOR_TIPO.pregunta, COLOR_TIPO.respuesta, COLOR_TIPO.eleccion, COLOR_TIPO.hazlo, VERDE_DICTADO];
const GRIS_PROBLEMA = '#8d929e';
/** Si el ícono del problema i va en su color: con el ratón encima, abierto o ya abierto antes; si no, en gris. Pura. */
function enColor(i, sobre, seleccionado, resueltos) {
  return sobre === i || seleccionado === i || resueltos.has(i);
}
const COLORES_TIPO = Object.values(COLOR_TIPO);
// El idioma de lo que se dibuja, sin depender de la página (las pruebas lo dibujan sin documento)
const EN_DIBUJO = typeof document !== 'undefined' && (document.documentElement?.lang || 'es').toLowerCase().startsWith('en');
// Los quince problemas de antes (nota de voz nmw19elcqtit) siguen como dieciséis SEGMENTOS: cada uno dibuja su situación
// y cómo la resuelve STL (el dieciseisavo, «una decisión vieja se cuela», es nuevo: pd_memoria_ventaja). Desde la nota de
// voz nmw1bwnvztit, el titular pidió unificarlos y sintetizarlos en cinco grandes problemas y alargar cada animación para
// presentar mejor lo agrupado: cada CLIP compone los segmentos de su problema, en dos tiempos, como eligió el titular
// (t_decide_clip_antes): primero cada situación como pasa al trabajar con IA por chat, unos segundos en rojo («Sin
// STL»), y después cómo la resuelve STL («Con STL», más despacio), con un rótulo abajo que dice cada paso y «1 de 3» arriba.
// Se dibujan en un canvas 2D de 320 × 200 (escalado a 1280 × 800). Cada una dura lo que necesita para contarse entera;
// pasa una vez y queda en su último cuadro. Desde la nota de voz nmw1kwbsftit, en vez de «↻ Repetir», una perilla chica
// como la de la animación del principio: la rueda la adelanta o la devuelve y el botón del centro la pausa o la sigue.
// Y desde la nota nmw1ktmeatit, problema y solución se intercalan, segmento por segmento.
const TINTAS = [CIAN, VERDE, NARANJA, ROJO, MORADO];
// Fueron el doble que al principio (6,5 y 15, notas nmw1fy9rytit y nmw1fz6igtit) y quedaron lentas: un 35 % más rápidas,
// ellas y su voz (nota de voz nmw1kwbsftit), y después otro 10 % más (nmw1oblmstit). Si la voz tarda más, cada rótulo
// espera a que termine (pd_narrador)
const RAPIDEZ = 1.35 * 1.1;
const PROBLEMA_SEG = 6.5 / RAPIDEZ;    // lo que se ve cada situación en rojo, sin STL
const SOLUCION_SEG = 15 / RAPIDEZ;     // y lo que se ve cada solución, con STL
// Cada animación empieza diciendo su enunciado, el «¿Te ha pasado…?» de su problema, escrito y con su voz (nota de voz
// nmw1olvthtit): lo que se ve sin voz, y si la voz tarda más, espera a que termine
const ENUNCIADO_SEG = 7 / RAPIDEZ;
// Los enunciados, tal como los dice la página (cada <summary> de la estación 2): los llena el mundo al arrancar
const ENUNCIADOS = [];
// Con los guiones del titular (notas de voz nmw24lltqtit a nmw27jyxjtit), cada rótulo es una frase, cortada en sus comas,
// y cada parte dura lo que su voz tarda en decirla: Kokoro em_santa dice unas 18 letras por segundo (medido en sus
// clips) y suena RAPIDEZ veces más rápida, con un respiro al final de cada rótulo. Los tiempos de arriba quedan como el
// mínimo de cada parte, para que las cortas no corran. La voz calla un momento en cada coma o punto de adentro (voz.py
// --pausas, nmw27xhb6tit): unos 0,3 segundos cada uno
const LETRAS_SEG = 18, RESPIRO = 0.35, PAUSA_SIGNO = 0.3;
const tardaVoz = (texto) => (String(texto).length / LETRAS_SEG + (String(texto).match(/[,;:.?!…]\s/g) ?? []).length * PAUSA_SIGNO) / RAPIDEZ + RESPIRO;
const sumaVoz = (pasos) => pasos.reduce((s, [, texto]) => s + tardaVoz(texto), 0);
// La voz de Google (pr_voz_google, pd_voz_video; el primer problema con el «Confirmo» nmw2p37bktit): la voz manda y la
// animación la sigue, como en «La línea del proyecto». tools/vozRecorrido.ts mide cada clip y escribe aquí lo que dura,
// en milisegundos (la pista de tiempos); suena a su ritmo natural, a la velocidad elegida, y cada rótulo dura su clip
// más un respiro: corto si la frase sigue en el rótulo siguiente, más largo al terminarla. Lo que no tiene pista sigue
// con Kokoro y su estimación de arriba
const PISTA_VOZ_ES = {"g1-e":12501,"g2-e":7264,"g4-e":7646,"g6-e":3784,"g7-e":5907,"s1-p1":2373,"s1-p2":2786,"s1-p3":2769,"s1-1":4087,"s1-2":4646,"s1-3":3948,"s1-c":5071,"s2-p1":2426,"s2-p2":1412,"s2-p3":2776,"s2-1":3711,"s2-2":2700,"s2-3":2042,"s2-4":4359,"s2-c":5156,"s3-p1":3380,"s3-p2":3166,"s3-1":2916,"s3-2":2798,"s3-3":5002,"s3-4":2241,"s3-5":3045,"s3-6":3400,"s3-c":4140,"s4-p1":3782,"s4-p2":1883,"s4-p3":3141,"s4-p4":2604,"s4-1":3537,"s4-2":4290,"s4-3":3915,"s4-4":2479,"s4-5":2876,"s4-6":3220,"s4-c":3581,"s5-p1":2440,"s5-1":3860,"s5-2":2285,"s5-3":2030,"s5-c":2321,"s6-p1":3846,"s6-1":3795,"s6-2":3514,"s6-3":3042,"s6-c":3091,"s7-p1":3805,"s7-1":4436,"s7-2":2258,"s7-3":3541,"s7-4":3132,"s7-5":1896,"s7-c":2658,"s8-p1":2835,"s8-p2":1923,"s8-1":4365,"s8-2":2077,"s8-3":2773,"s8-c":2455,"s9-1":4418,"s9-2":2926,"s9-3":1763,"s9-5":2704,"s9-c":2804,"s11-p1":3471,"s11-p2":1971,"s11-1":3209,"s11-2":1538,"s11-3":3724,"s11-4":1808,"s11-5":4183,"s11-c":2347,"s12-p1":2229,"s12-p2":2258,"s12-1":5048,"s12-2":3691,"s12-3":3487,"s12-c":3506,"s13-p1":2542,"s13-p2":4317,"s13-1":5810,"s13-2":2757,"s13-3":4478,"s13-4":4215,"s13-5":4301,"s13-6":4290,"s13-c":2692,"s14-p1":3116,"s14-p2":4166,"s14-1":3755,"s14-2":3517,"s14-3":3180,"s14-4":2267,"s14-5":4202,"s14-6":4333,"s14-c":2389,"s15-p1":2011,"s15-p2":2693,"s15-p3":2717,"s15-1":5221,"s15-2":3885,"s15-3":5060,"s15-4":4353,"s15-5":4632,"s15-6":2285,"s15-7":2924,"s15-8":2955,"s15-9":3047,"s15-c":4359,"como-1":3554,"como-2":5728,"como-3":2544,"como-4":7545,"como-5":2482,"como-6":3434,"como-7":3693,"como-c":2312};
// Los respiros, cortos (nota de voz nmw2qhhsjtit: la voz parecía esperar a la animación): los clips ya vienen sin el
// silencio de sus bordes, así que en una coma la frase sigue casi de corrido y al terminarla respira lo que en «La línea
// del proyecto»
const RESPIRO_COMA = 0.05, RESPIRO_FRASE = 0.35, RESPIRO_ENUNCIADO = 0.5;
// Las pausas estratégicas, en segundos, después de un rótulo y antes del remate: «sin perder esa idea o ajuste nuevo»
// … y lo que queda en la ruta (nota de voz nmw2r873etit; el texto nuevo, sin los dos puntos, llega con su clip)
const PAUSA_VOZ_ES = { 's3-5': 0.6 };
// Los clips de Google que su voz dice demasiado despacio suenan más rápido, a su propio ritmo, como en «La línea del
// proyecto» (RITMO_VOZ). «y se organiza automáticamente» fue a 1,2 mientras esperaba su clip nuevo, sin la coma
// (nmw2qiyuwtit); con él (el «Confirmo» nmw2rqwg6tit), suena a su ritmo natural, como las demás
const RITMO_VOZ_ES = {};
const ritmoDeClave = (clave) => (PISTA_VOZ_ES[clave] == null ? RAPIDEZ : RITMO_VOZ_ES[clave] ?? 1);
// Lo que dura la voz de un clip de Google en el reloj del clip (a 1x), en segundos
const segDeVoz = (clave) => PISTA_VOZ_ES[clave] / 1000 / ritmoDeClave(clave);
const claveDePaso = (j, enProblema, m) => `s${j + 1}-${enProblema ? 'p' : ''}${m + 1}`;
const conPista = (j, enProblema) => (enProblema ? PASOS_SEG[j].problema : PASOS_SEG[j].solucion).every((_, m) => PISTA_VOZ_ES[claveDePaso(j, enProblema, m)] != null);
// Lo que dura cada paso de un segmento con pista: su clip y su respiro
const tiemposConPista = (j, enProblema) => {
  const lista = enProblema ? PASOS_SEG[j].problema : PASOS_SEG[j].solucion;
  return lista.map(([, texto], m) => segDeVoz(claveDePaso(j, enProblema, m)) + (m === lista.length - 1 || /[.?!]$/.test(texto.trim()) ? RESPIRO_FRASE : RESPIRO_COMA) + (PAUSA_VOZ_ES[claveDePaso(j, enProblema, m)] ?? 0));
};
const suma = (xs) => xs.reduce((s, x) => s + x, 0);
const problemaSeg = (j) => Math.max(PROBLEMA_SEG, conPista(j, true) ? suma(tiemposConPista(j, true)) : sumaVoz(PASOS_SEG[j].problema));
const solucionSeg = (j) => Math.max(SOLUCION_SEG, conPista(j, false) ? suma(tiemposConPista(j, false)) : sumaVoz(PASOS_SEG[j].solucion));
const enunciadoSeg = (i) => {
  const clave = `g${i + 1}-e`;
  return Math.max(ENUNCIADO_SEG, PISTA_VOZ_ES[clave] == null ? tardaVoz(ENUNCIADOS[i] ?? '') : segDeVoz(clave) + RESPIRO_ENUNCIADO);
};
// En un segmento con pista, cuánto va de él (q, de 0 a 1) a los d segundos: cada paso dura lo que su voz, y dentro de él
// el dibujo avanza de su «desde» al del siguiente, así lo que se ve sigue a lo que se dice (si el segmento dura más que
// su voz, por su mínimo, cada paso se estira en la misma proporción)
function qConPista(j, enProblema, d) {
  const lista = enProblema ? PASOS_SEG[j].problema : PASOS_SEG[j].solucion;
  const tiempos = tiemposConPista(j, enProblema), total = enProblema ? problemaSeg(j) : solucionSeg(j);
  const k = total / suma(tiempos);
  let va = 0;
  for (let m = 0; m < lista.length; m++) {
    const dura = tiempos[m] * k, hasta = m + 1 < lista.length ? lista[m + 1][0] : 1;
    if (d < va + dura || m === lista.length - 1) return tope(lista[m][0] + ((d - va) / dura) * (hasta - lista[m][0]));
    va += dura;
  }
  return 1;
}
// Dónde se dibuja lo de cada situación: escalado al 90 % alrededor del centro, bajo las píldoras de arriba (pintarClip)
const CONTENIDO = { x: 16, y: 9.4, escala: 0.9 };
const lerp = (a, b, k) => a + (b - a) * k;
const tope = (k) => Math.max(0, Math.min(1, k));
const suave = (k) => k * k * (3 - 2 * k);
const tramo = (p, a, b) => suave(tope((p - a) / (b - a)));
// Un resplandor tibio detrás de un actor, como el de la estación 1 (resplandor()): rgb, como «255, 241, 196»
function brilloActor(c, x, y, r, rgb) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb}, .4)`); g.addColorStop(0.45, `rgba(${rgb}, .14)`); g.addColorStop(1, `rgba(${rgb}, 0)`);
  c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
}
// La carita de los cubos de la estación 1 (iniciar() › carita): ojos, mejillas y sonrisa; l es el lado del cubo
function caritaCubo(c, l, feliz = false, tinta = '#1a1f33') {
  const k = l / 256;
  c.save(); c.scale(k, k); c.translate(-128, -128);
  c.fillStyle = tinta; c.strokeStyle = tinta; c.lineCap = 'round';
  for (const ox of [-58, 58]) { c.beginPath(); c.ellipse(128 + ox, 106, 15, 22, 0, 0, 7); c.fill(); }
  c.fillStyle = 'rgba(255, 140, 150, .6)';
  for (const ox of [-86, 86]) { c.beginPath(); c.arc(128 + ox, 150, 15, 0, 7); c.fill(); }
  c.lineWidth = 11; c.beginPath(); c.moveTo(88, 158); c.quadraticCurveTo(128, 202, 168, 158);
  // Feliz, con la boca abierta en su sonrisa: en el cierre de cada problema (nmw3ruscptit)
  if (feliz) { c.closePath(); c.fillStyle = tinta; c.fill(); } else c.stroke();
  c.restore();
}
// El desarrollador: el cubo redondeado amarillo (AMARILLO_TU) con su carita y su luz tibia, el de la estación 1; s = 1 es
// un cubo de 18 de lado
function actorDev(c, x, y, s, feliz = false) {
  c.save(); c.translate(x, y); c.scale(s, s);
  brilloActor(c, 0, 0, 22, '255, 241, 196');
  c.fillStyle = AMARILLO_TU; c.beginPath(); c.roundRect(-9, -9, 18, 18, 3); c.fill();
  caritaCubo(c, 17, feliz);
  c.restore();
}
// El director: el cubo blanco con el visor oscuro de su cara (ojos y sonrisa de luz cian), el de la estación 1; r es la
// mitad de su diagonal de antes, así que un cubo de r × 1,5 de lado
function actorDirector(c, x, y, r) {
  const l = r * 1.5, k = l / 256;
  c.save(); c.translate(x, y);
  c.fillStyle = '#f4f1ea'; c.beginPath(); c.roundRect(-l / 2, -l / 2, l, l, l * 0.18); c.fill();
  c.scale(k, k); c.translate(-128, -128);
  c.fillStyle = '#2b2826'; c.beginPath(); c.roundRect(26, 48, 204, 150, 62); c.fill();
  c.strokeStyle = '#a8f4fb'; c.lineWidth = 14; c.lineCap = 'round';
  for (const ox of [-44, 44]) { c.beginPath(); c.arc(128 + ox, 118, 17, Math.PI, 0); c.stroke(); }
  c.beginPath(); c.moveTo(98, 152); c.quadraticCurveTo(128, 180, 158, 152); c.stroke();
  c.restore();
}
// El modelo: el cubo gris azulado (MODELO) con su carita oscura y su luz fría, el de la estación 1; r, como el de la bola
// de antes (un cubo de r × 1,8 de lado)
function actorModelo(c, x, y, r, alfa = 1) {
  const l = r * 1.8;
  c.save(); c.globalAlpha *= alfa; c.translate(x, y);
  brilloActor(c, 0, 0, r * 2.2, '197, 210, 230');
  c.fillStyle = MODELO; c.beginPath(); c.roundRect(-l / 2, -l / 2, l, l, l * 0.16); c.fill();
  caritaCubo(c, l * 0.92);
  c.restore();
}
// El Studio: el cubo morado translúcido con su marco (una cara de atrás desplazada, para que se lea como cubo) y, dentro,
// el director. conDirector = false cuando adentro va otro contenido (el Buzón con sus notas)
function actorStudio(c, x, y, w, h, conDirector = true) {
  // (la cara de atrás va abajo y a la derecha: los rótulos de los cubos van arriba y no la tocan)
  const d = Math.min(3.5, h * 0.1);
  c.save();
  c.strokeStyle = MORADO; c.lineWidth = 1; c.globalAlpha *= 0.45;
  c.beginPath(); c.rect(x + d, y + d, w, h); c.stroke();
  for (const [px, py] of [[x + w, y], [x + w, y + h], [x, y + h]]) { c.beginPath(); c.moveTo(px, py); c.lineTo(px + d, py + d); c.stroke(); }
  c.restore();
  c.fillStyle = 'rgba(185, 163, 255, .12)'; c.strokeStyle = MORADO; c.lineWidth = 2;
  c.beginPath(); c.roundRect(x, y, w, h, 4); c.fill(); c.stroke();
  if (conDirector) actorDirector(c, x + w / 2, y + h / 2, Math.min(w, h) * 0.22);
}
// Los íconos de cada tipo de nota, con su color del Studio: un error es un rayo; una idea, una bombilla; un ajuste, un
// engranaje; una petición, un sobre; un comentario, un globo de diálogo. s = 1 mide unos 14 de alto
function iconoNota(c, tipo, x, y, s = 1, alfa = 1) {
  const color = COLOR_TIPO[tipo] ?? ORO;
  c.save(); c.globalAlpha *= alfa; c.translate(x, y); c.scale(s * 14, s * 14);
  c.fillStyle = color; c.strokeStyle = color; c.lineWidth = 0.08; c.lineJoin = 'round'; c.lineCap = 'round';
  if (tipo === 'falla') {
    c.beginPath(); c.moveTo(0.12, -0.5); c.lineTo(-0.3, 0.05); c.lineTo(-0.03, 0.05); c.lineTo(-0.14, 0.52); c.lineTo(0.3, -0.1); c.lineTo(0.03, -0.1); c.closePath(); c.fill();
  } else if (tipo === 'idea') {
    c.beginPath(); c.arc(0, -0.12, 0.3, 0, 7); c.fill();
    c.beginPath(); c.roundRect(-0.12, 0.18, 0.24, 0.14, 0.04); c.fill();
    c.beginPath(); c.roundRect(-0.07, 0.34, 0.14, 0.08, 0.03); c.fill();
    c.strokeStyle = color; c.beginPath();
    for (const a of [-2.4, -1.57, -0.74]) { c.moveTo(Math.cos(a) * 0.4, -0.12 + Math.sin(a) * 0.4); c.lineTo(Math.cos(a) * 0.52, -0.12 + Math.sin(a) * 0.52); }
    c.stroke();
  } else if (tipo === 'ajuste') {
    c.beginPath();
    for (let k = 0; k < 32; k++) { const a = (k / 32) * Math.PI * 2, r = k % 4 === 1 || k % 4 === 2 ? 0.46 : 0.34; if (k) c.lineTo(Math.cos(a) * r, Math.sin(a) * r); else c.moveTo(r, 0); }
    c.closePath(); c.moveTo(0.14, 0); c.arc(0, 0, 0.14, 0, 7); c.fill('evenodd');   // con su hueco en el centro
  } else if (tipo === 'pregunta') {
    c.beginPath(); c.roundRect(-0.42, -0.28, 0.84, 0.56, 0.06); c.fill();
    c.strokeStyle = LUZ; c.lineWidth = 0.07; c.beginPath(); c.moveTo(-0.4, -0.26); c.lineTo(0, 0.06); c.lineTo(0.4, -0.26); c.stroke();
  } else {   // respuesta: el globo de diálogo con su colita
    c.beginPath(); c.roundRect(-0.46, -0.34, 0.92, 0.55, 0.14); c.fill();
    c.beginPath(); c.moveTo(-0.26, 0.2); c.lineTo(-0.34, 0.46); c.lineTo(-0.04, 0.2); c.closePath(); c.fill();
  }
  c.restore();
}
// Una misión: la placa dorada de la estación 1 con su nombre; verde y con su ✓ si ya está hecha
function placaMision(c, x, y, w, texto, hecha = false, alfa = 1) {
  c.save(); c.globalAlpha *= alfa;
  caja(c, x, y, w, 20, hecha ? VERDE : ORO, 0.2, 6);
  letrero(c, texto, x + 8, y + 13.5, hecha ? '#dff5e8' : '#fffaf0', 9, 'left');
  if (hecha) palomita(c, x + w - 11, y + 10, 4.5);
  c.restore();
}
function bola(c, x, y, r, color, alfa = 1) { c.save(); c.globalAlpha *= alfa; c.fillStyle = color; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.restore(); }
function letrero(c, texto, x, y, color = LUZ, tam = 10, alinea = 'center') {
  c.font = `600 ${tam}px system-ui, sans-serif`; c.textAlign = alinea; c.fillStyle = color; c.fillText(texto, x, y);
}
function palomita(c, x, y, r, alfa = 1) {
  c.save(); c.globalAlpha *= alfa; c.strokeStyle = VERDE; c.lineWidth = 2.2; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(x - r, y); c.lineTo(x - r * 0.3, y + r * 0.7); c.lineTo(x + r, y - r * 0.7); c.stroke(); c.restore();
}
function cruz(c, x, y, r, alfa = 1) {
  c.save(); c.globalAlpha *= alfa; c.strokeStyle = ROJO; c.lineWidth = 2.2; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x - r, y - r); c.lineTo(x + r, y + r); c.moveTo(x + r, y - r); c.lineTo(x - r, y + r); c.stroke(); c.restore();
}
// Un recuadro con su borde y un relleno tenue de su color
function caja(c, x, y, w, h, color, relleno = 0.12, r = 7) {
  c.save(); c.fillStyle = color; c.globalAlpha *= relleno; c.beginPath(); c.roundRect(x, y, w, h, r); c.fill(); c.restore();
  c.save(); c.strokeStyle = color; c.lineWidth = 1.2; c.globalAlpha *= 0.8; c.beginPath(); c.roundRect(x, y, w, h, r); c.stroke(); c.restore();
}
// Una ventana (la del chat, una sesión, un documento), con su nombre arriba
function ventana(c, x, y, w, h, titulo, color = ROJO) {
  caja(c, x, y, w, h, color, 0.06);
  letrero(c, titulo, x + 7, y + 10, color, 7.5, 'left');
}
// Un globo de texto: de ti, hacia la derecha desde x; del modelo (derecha = true), hacia la izquierda desde x
function globo(c, x, y, texto, color, derecha = false, alfa = 1) {
  c.font = '600 8.5px system-ui, sans-serif';
  const w = c.measureText(texto).width + 14, x0 = derecha ? x - w : x;
  c.save(); c.globalAlpha *= alfa;
  caja(c, x0, y, w, 15, color, 0.22, 7.5);
  letrero(c, texto, x0 + 7, y + 10.5, '#fffaf0', 8.5, 'left');
  c.restore();
}
// Renglones de texto: n barras, la última más corta
function renglones(c, x, y, w, n, color, alfa = 1, paso = 7) {
  c.save(); c.globalAlpha *= alfa; c.fillStyle = color;
  for (let k = 0; k < n; k++) { c.beginPath(); c.roundRect(x, y + k * paso, k === n - 1 ? w * 0.6 : w, 3.2, 1.6); c.fill(); }
  c.restore();
}
function barra(c, x, y, w, k, color) {
  caja(c, x, y, w, 10, '#8f8a7d', 0.08, 5);
  c.fillStyle = color; c.beginPath(); c.roundRect(x, y, Math.max(0.5, w * k), 10, 5); c.fill();
}
function lupa(c, x, y, r = 7) {
  c.save(); c.strokeStyle = LUZ; c.lineWidth = 2; c.lineCap = 'round';
  c.beginPath(); c.arc(x, y, r, 0, 7); c.moveTo(x + r * 0.7, y + r * 0.7); c.lineTo(x + r * 1.6, y + r * 1.6); c.stroke(); c.restore();
}
function altavoz(c, x, y) {   // leer en voz alta
  c.save(); c.fillStyle = LUZ; c.strokeStyle = LUZ; c.lineWidth = 1.4;
  c.beginPath(); c.moveTo(x - 7, y - 3); c.lineTo(x - 3, y - 3); c.lineTo(x + 2, y - 8); c.lineTo(x + 2, y + 8); c.lineTo(x - 3, y + 3); c.lineTo(x - 7, y + 3); c.closePath(); c.fill();
  for (const r of [6, 10]) { c.beginPath(); c.arc(x + 2, y, r, -0.7, 0.7); c.stroke(); }
  c.restore();
}
// Un micrófono, para dictar tus notas (pd_dictado): su cabeza redondeada, su soporte en U y su pie
function microfono(c, x, y, color, s = 1) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = color; c.beginPath(); c.roundRect(-4.5, -15, 9, 16, 4.5); c.fill();
  c.strokeStyle = color; c.lineWidth = 1.6; c.lineCap = 'round';
  c.beginPath(); c.arc(0, -5, 7.5, 0.15, Math.PI - 0.15); c.moveTo(0, 2.5); c.lineTo(0, 8); c.moveTo(-5, 8); c.lineTo(5, 8); c.stroke();
  c.restore();
}
// Un reloj chico que corre: k va de 0 a 1 (una vuelta de su aguja), el de «El director espera al modelo»
function relojito(c, x, y, r, k) {
  c.save(); c.strokeStyle = LUZ; c.lineWidth = 1.2; c.lineCap = 'round';
  c.beginPath(); c.arc(x, y, r, 0, 7); c.moveTo(x, y); c.lineTo(x + Math.sin(k * Math.PI * 2) * r * 0.75, y - Math.cos(k * Math.PI * 2) * r * 0.75); c.stroke();
  c.restore();
}
// Mientras la voz de un rótulo no ha cargado lo suficiente para sonar, la animación espera quieta y encima se ve que carga
// (nota de voz nmw5d6iqctit: «hasta que el audio no esté cargado y listo para responderse, mostremos algún tipo de loader»,
// en todas las animaciones): el cuadro se oscurece y un arco gira con «Cargando la voz…». w y h, el tamaño del lienzo; s,
// los segundos de la página, para que gire
function pintarCargando(c, w, h, s) {
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = 'rgba(7, 9, 15, .55)'; c.fillRect(0, 0, w, h);
  const r = Math.min(w, h) * 0.05, x = w / 2, y = h / 2 - r * 0.6, a = s * 5;
  c.strokeStyle = 'rgba(255, 255, 255, .15)'; c.lineWidth = r * 0.22; c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke();
  c.strokeStyle = ORO; c.lineCap = 'round'; c.beginPath(); c.arc(x, y, r, a, a + 1.6); c.stroke();
  c.font = `600 ${Math.round(r * 0.6)}px system-ui, sans-serif`; c.textAlign = 'center'; c.fillStyle = LUZ;
  c.fillText(EN_DIBUJO ? 'Loading the voice…' : 'Cargando la voz…', x, y + r * 2.1);
  c.restore();
}
function trazo(c, x1, y1, x2, y2, color, alfa = 1, punteado = false) {
  c.save(); c.globalAlpha *= alfa; c.strokeStyle = color; c.lineWidth = 1.4; if (punteado) c.setLineDash([3, 3]);
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); c.restore();
}
function wifi(c, x, y, color, cortado = false, alfa = 1) {   // la señal de internet, con su raya encima si se cortó
  c.save(); c.globalAlpha *= alfa; c.strokeStyle = color; c.fillStyle = color; c.lineWidth = 1.8; c.lineCap = 'round';
  for (const r of [6, 11, 16]) { c.beginPath(); c.arc(x, y + 9, r, -2.3, -0.84); c.stroke(); }
  c.beginPath(); c.arc(x, y + 9, 1.9, 0, 7); c.fill();
  if (cortado) { c.strokeStyle = ROJO; c.lineWidth = 2.6; c.beginPath(); c.moveTo(x - 13, y - 8); c.lineTo(x + 13, y + 16); c.stroke(); }
  c.restore();
}
// Tres soluciones de las animaciones de antes, que siguen como la solución de su segmento (el 1, el 4 y el 11)
const DE_ANTES = [
  // Tu pedido llega al Buzón del Studio, lo corriges allí y solo entonces lo lee el director
  (c, p, tinta) => {
    actorDev(c, 40, 118, 1.6); letrero(c, 'tú', 40, 150, '#cfe0ff');
    actorStudio(c, 110, 78, 100, 70, false); letrero(c, 'Buzón del Studio', 160, 70, MORADO);
    actorDirector(c, 160, 36, 11); letrero(c, 'el director', 160, 18, ORO);
    const x = p < 0.3 ? lerp(60, 150, tramo(p, 0, 0.3)) : 150, y = p < 0.3 ? 118 - Math.sin(tramo(p, 0, 0.3) * Math.PI) * 24 : p < 0.7 ? 114 : lerp(114, 48, tramo(p, 0.7, 0.9));
    const editada = p > 0.45;
    bola(c, x, y, 7, editada ? VERDE : tinta);
    if (p > 0.3 && p < 0.7) letrero(c, editada ? 'la corriges' : 'te faltó algo', 160, 138, editada ? VERDE : ROJO, 9.5);
    if (p > 0.92) palomita(c, 160, 58, 5);
    actorModelo(c, 285, 60, 10, 0.5); letrero(c, 'el modelo', 285, 84, MODELO, 9);
  },
  // Leer lo que responde: una idea a la vez, con «Entendido», y lo que sigue queda tapado
  (c, p, tinta) => {
    const n = Math.min(2, Math.floor(p * 3)), q = (p * 3) % 1;
    for (let k = 0; k < 3; k++) {
      const y = 36 + k * 44, hecho = k < n, activa = k === n;
      c.fillStyle = 'rgba(255, 255, 255, .07)'; c.beginPath(); c.roundRect(50, y, 220, 34, 8); c.fill();
      c.fillStyle = hecho || activa ? tinta : 'rgba(255, 255, 255, .15)'; c.globalAlpha = hecho ? 0.45 : 1;
      c.beginPath(); c.roundRect(62, y + 9, activa ? 150 : 110, 5, 3); c.fill(); c.beginPath(); c.roundRect(62, y + 20, activa ? 110 : 80, 5, 3); c.fill(); c.globalAlpha = 1;
      if (hecho) palomita(c, 252, y + 17, 6);
      if (activa && q > 0.6) { c.fillStyle = ORO; c.beginPath(); c.roundRect(200, y + 6, 62, 22, 11); c.fill(); letrero(c, 'Entendido', 231, y + 21, '#1a1f33', 9.5); }
      if (k > n) { c.fillStyle = 'rgba(11, 15, 28, .78)'; c.beginPath(); c.roundRect(50, y, 220, 34, 8); c.fill(); }
    }
    actorDev(c, 24, 90, 1.1);
  },
  // Volver otro día: el estado queda guardado y la misión sigue ahí, a la vista
  (c, p, tinta) => {
    c.strokeStyle = LINEA; c.lineWidth = 3; c.beginPath(); c.moveTo(20, 118); c.lineTo(300, 118); c.stroke();
    for (let k = 0; k < 5; k++) {
      const hecho = k < 2, sigue = k === 2, x = 50 + k * 56;
      bola(c, x, 118, sigue ? 7 + Math.sin(p * 30) * 1.3 : 5, hecho ? VERDE : sigue ? ORO : '#5b6482');
      if (hecho) palomita(c, x, 118, 3);
    }
    letrero(c, 'tu misión', 162, 98, ORO, 10);
    const x = lerp(-10, 106, tramo(p, 0, 0.35));
    actorDev(c, x, 86, 1.5);
    ['el plan', 'el mapa', 'lo que dijiste'].forEach((t, k) => {
      const a = tramo(p, 0.4 + k * 0.12, 0.52 + k * 0.12);
      c.globalAlpha = a; c.fillStyle = 'rgba(185, 163, 255, .16)'; c.strokeStyle = MORADO; c.lineWidth = 1.2;
      c.beginPath(); c.roundRect(190, 20 + k * 20, 100, 16, 5); c.fill(); c.stroke(); letrero(c, t, 240, 32 + k * 20, LUZ, 9); c.globalAlpha = 1;
    });
    letrero(c, 'estado guardado: no repites nada', 160, 154, tinta, 9.5);
  },
];
// Los trece segmentos que quedan con los guiones del 4 de noviembre: doce de antes y la caja negra, nueva. Cada uno con su
// problema (q va de 0 a 1 en problemaSeg segundos) y su solución (q va de 0 a 1 en solucionSeg)
const SEGMENTOS = [
  { // 1. El mensaje que se fue incompleto
    problema: (c, q) => {
      ventana(c, 30, 22, 260, 140, 'el chat con el modelo');
      actorDev(c, 52, 140, 1.3);
      actorModelo(c, 262, 52, 9);
      if (q > 0.06) globo(c, 70, 112 - tramo(q, 0.06, 0.3) * 60, 'Hazme el inicio de sesión', CIAN);
      if (q > 0.35) globo(c, 250, 76, 'Escribiendo…', MODELO, true, 0.6 + 0.4 * Math.sin(q * 30) ** 2);
      if (q > 0.4) { globo(c, 70, 112, '…y que entre con Google', ROJO); cruz(c, 200, 119, 4); }
      // Cada corrección es otro mensaje, y los tokens se multiplican (nmw262jl0tit)
      if (q > 0.4) letrero(c, `${q > 0.75 ? 3 : q > 0.55 ? 2 : 1} × los tokens`, 282, 40, ROJO, 9, 'right');
      if (q > 0.7) letrero(c, 'otro mensaje, y otro, para corregir', 160, 156, ROJO, 9.5);
    },
    solucion: (c, q, tinta) => DE_ANTES[0](c, q, tinta),
  },
  { // 2. Las varias sesiones a la vez
    problema: (c, q) => {
      const foco = Math.floor(q * 9) % 4;
      [[30, 22], [180, 22], [30, 92], [180, 92]].forEach(([x, y], k) => {
        ventana(c, x, y, 110, 54, `sesión ${k + 1}`, k === foco ? ROJO : '#8f8a7d');
        renglones(c, x + 8, y + 18, 80, 4, k === foco ? '#ffd0da' : 'rgba(255, 255, 255, .25)', 1, 8);
        if (k === foco) trazo(c, 160, 84, x + 55, y + 27, ROJO, 0.7, true);
      });
      actorDev(c, 160, 84, 1.2);
      if (q > 0.55) letrero(c, '¿en qué iba?', 160, 166, ROJO, 10);
    },
    solucion: (c, q) => {
      const k = tramo(q, 0, 0.3);
      if (k < 1) [[30, 22], [180, 22], [30, 92], [180, 92]].forEach(([x, y]) => {
        c.save(); c.globalAlpha *= 1 - k; ventana(c, lerp(x, 110, k), lerp(y, 40, k), lerp(110, 100, k), 54, 'sesión', '#8f8a7d'); c.restore();
      });
      if (q > 0.25) {
        c.save(); c.globalAlpha *= tramo(q, 0.25, 0.4);
        actorStudio(c, 110, 40, 100, 58); letrero(c, 'el Studio: un solo canal', 160, 34, MORADO, 9);
        c.restore();
      }
      actorDev(c, 50, 132, 1.3);
      if (q > 0.4) trazo(c, 62, 124, 110, 92, ORO, tramo(q, 0.4, 0.5));
      if (q > 0.5) placaMision(c, 100, 120, 130, 'Tu misión de ahora', q > 0.85, tramo(q, 0.5, 0.6));
      if (q > 0.65) letrero(c, 'un proyecto · una misión', 165, 160, VERDE, 9.5);
    },
  },
  { // 3. La idea que se cuela a mitad de algo
    problema: (c, q) => {
      letrero(c, 'lo que ibas a hacer', 60, 44, LUZ, 9, 'left');
      barra(c, 60, 52, 200, Math.min(0.4, q * 1.4), q > 0.45 ? ROJO : ORO);
      if (q > 0.3) iconoNota(c, 'idea', 250, 112, 1.5, tramo(q, 0.3, 0.38));
      actorDev(c, lerp(80, 226, tramo(q, 0.42, 0.7)), 116, 1.3);
      if (q > 0.72) letrero(c, 'y lo otro se quedó a medias', 160, 160, ROJO, 9.5);
    },
    solucion: (c, q) => {
      letrero(c, 'lo que ibas a hacer', 60, 44, LUZ, 9, 'left');
      barra(c, 60, 52, 200, lerp(0.4, 1, tramo(q, 0.05, 0.9)), ORO);
      if (q > 0.9) palomita(c, 274, 57, 5);
      actorDev(c, 40, 57, 1.1);
      actorStudio(c, 226, 80, 70, 36, false); letrero(c, 'el Buzón', 261, 102, MORADO, 9);
      // La ruta, con sus fases: la idea va a la suya
      c.strokeStyle = LINEA; c.lineWidth = 2.5; c.beginPath(); c.moveTo(30, 150); c.lineTo(290, 150); c.stroke();
      ['fase 1', 'fase 2', 'fase 3'].forEach((f, k) => { bola(c, 60 + k * 73, 150, 4, ORO); letrero(c, f, 60 + k * 73, 166, LUZ, 8); });
      const k1 = tramo(q, 0, 0.25), k2 = tramo(q, 0.35, 0.65);
      if (q > 0.3) { c.save(); c.globalAlpha *= tramo(q, 0.3, 0.38); actorDirector(c, 190, 120, 7); c.restore(); }
      iconoNota(c, 'idea', q < 0.35 ? lerp(70, 261, k1) : lerp(261, 206, k2), q < 0.35 ? lerp(80, 98, k1) - Math.sin(k1 * Math.PI) * 20 : lerp(98, 138, k2), 1.4);
    },
  },
  { // 4. Las respuestas largas
    problema: (c, q) => {
      // El recuadro termina en 160 y su rótulo va debajo, en 174: antes el texto del recuadro le pasaba por encima (nmw1g3dfftit)
      ventana(c, 50, 16, 190, 144, 'la respuesta del modelo');
      c.save(); c.beginPath(); c.rect(52, 30, 186, 128); c.clip();
      renglones(c, 64, 36 - q * 120, 160, 30, 'rgba(255, 255, 255, .35)', 1, 9);
      c.restore();
      const a = 1 - tramo(q, 0.1, 0.9);
      letrero(c, 'tu atención', 272, 30, LUZ, 8.5);
      caja(c, 262, 38, 20, 120, '#8f8a7d', 0.06, 5);
      c.fillStyle = a > 0.4 ? VERDE : ROJO; c.beginPath(); c.roundRect(264, 40 + 116 * (1 - a), 16, Math.max(0.5, 116 * a), 4); c.fill();
      if (q > 0.65) letrero(c, 'y le dices «sí» a todo', 145, 174, ROJO, 9);
    },
    solucion: (c, q, tinta) => {
      DE_ANTES[1](c, Math.min(1, q / 0.6), tinta);
      if (q > 0.62) { altavoz(c, 296, 70); letrero(c, 'en voz alta', 292, 96, LUZ, 8); }
      // Y cada idea se comenta en su lugar, con su ✉, sin explicar a qué parte te refieres (nmw26xb5ltit)
      if (q > 0.78) { caja(c, 278, 118, 28, 20, ORO, 0.3, 6); letrero(c, '✉', 292, 132, '#fffaf0', 11); letrero(c, 'comenta aquí', 292, 152, LUZ, 8); }
    },
  },
  { // 5. Lo que ya leíste y lo que no
    problema: (c, q) => {
      ventana(c, 60, 16, 200, 150, 'el documento', '#8f8a7d');
      for (let k = 0; k < 5; k++) {
        renglones(c, 74, 34 + k * 26, 150, 2, 'rgba(255, 255, 255, .35)', 1, 8);
        if (q > 0.15 + k * 0.12) letrero(c, '?', 240, 43 + k * 26, ROJO, 13);
      }
      actorDev(c, 34, 120, 1.2);
      if (q > 0.6) letrero(c, '¿esto ya lo leí?', 160, 177, ROJO, 9.5);
    },
    solucion: (c, q, tinta) => {
      ventana(c, 60, 16, 200, 150, 'el documento', '#8f8a7d');
      letrero(c, 'Parte 2', 74, 38, ORO, 9.5, 'left');
      const n = Math.min(5, Math.floor(q / 0.15));
      for (let k = 0; k < 5; k++) {
        const y = 48 + k * 22;
        if (k === n) { c.fillStyle = tinta; c.fillRect(68, y - 2, 3, 13); }
        renglones(c, 74, y, 150, 2, k < n ? 'rgba(255, 255, 255, .25)' : 'rgba(255, 255, 255, .45)', 1, 6);
        if (k < n) palomita(c, 240, y + 4, 4.5);
      }
      actorDev(c, 34, 120, 1.2);
      if (q > 0.8) { caja(c, 200, 27, 50, 15, VERDE, 0.3, 7); letrero(c, 'leída', 225, 38, '#dff5e8', 8.5); }
    },
  },
  { // 6. El documento que te mandan a releer
    problema: (c, q) => {
      ventana(c, 60, 16, 200, 150, 'el documento que ya leíste', '#8f8a7d');
      for (let k = 0; k < 5; k++) {
        renglones(c, 74, 34 + k * 26, 150, 2, 'rgba(255, 255, 255, .35)', 1, 8);
        if (q < 0.5) palomita(c, 240, 38 + k * 26, 4.5);
      }
      if (q > 0.3) { c.fillStyle = ROJO; c.fillRect(68, 84, 3, 14); letrero(c, 'le cambiaron algo', 160, 128, ROJO, 9); }
      if (q > 0.55) { trazo(c, 250, 150, 250, 34, ROJO, 0.8); trazo(c, 250, 34, 245, 42, ROJO, 0.8); trazo(c, 250, 34, 255, 42, ROJO, 0.8); letrero(c, 'léelo otra vez entero', 160, 177, ROJO, 9.5); }
    },
    solucion: (c, q) => {
      ventana(c, 30, 16, 150, 150, 'lo que ya leíste', '#8f8a7d');
      for (let k = 0; k < 5; k++) { renglones(c, 42, 34 + k * 26, 100, 2, 'rgba(255, 255, 255, .35)', 1, 8); palomita(c, 162, 38 + k * 26, 4.5); }
      if (q > 0.1) { bola(c, 150, 144, 14, ORO, tramo(q, 0.1, 0.25)); letrero(c, 'sellado', 150, 147, '#1a1f33', 7.5); }
      const x = lerp(330, 196, tramo(q, 0.3, 0.55));
      ventana(c, x, 50, 100, 70, 'lo nuevo', VERDE);
      renglones(c, x + 10, 72, 76, 2, VERDE, 1, 9);
      if (q > 0.65) letrero(c, 'solo lo que cambió', 246, 136, VERDE, 9.5);
    },
  },
  { // 7. La pregunta que ya decidiste
    problema: (c, q) => {
      ventana(c, 30, 20, 260, 140, 'el chat con el modelo');
      const sube = tramo(q, 0.15, 0.4);
      c.save(); c.beginPath(); c.rect(32, 32, 256, 126); c.clip();
      // Sube y se apaga, pero se queda debajo del nombre de la ventana, sin pisarlo (nmw5d6iqctit)
      globo(c, 44, 44 - sube * 8, 'Usemos la opción A', CIAN, false, 1 - sube * 0.7);
      c.restore();
      if (q > 0.4) globo(c, 276, 74, '¿Usamos A o B?', MODELO, true);
      if (q > 0.7) { globo(c, 276, 102, 'Hice la B', ROJO, true); letrero(c, 'ya lo habías decidido', 160, 146, ROJO, 9.5); }
    },
    solucion: (c, q) => {
      caja(c, 30, 30, 110, 70, ORO, 0.1); letrero(c, 'En firme', 85, 44, ORO, 9.5);
      ['opción A', 'sin Google', 'en español'].forEach((t, k) => letrero(c, `· ${t}`, 42, 60 + k * 13, LUZ, 8.5, 'left'));
      actorDirector(c, 222, 60, 12); letrero(c, 'el director', 222, 84, ORO, 9);
      if (q < 0.55) lupa(c, lerp(170, 80, tramo(q, 0.1, 0.45)), 57, 7);
      if (q > 0.5) { c.save(); c.strokeStyle = VERDE; c.lineWidth = 1.5; c.strokeRect(38, 51, 64, 12); c.restore(); }
      if (q > 0.6) globo(c, 120, 118, 'Ya lo decidiste: la opción A', VERDE, false, tramo(q, 0.6, 0.7));
      if (q > 0.8) letrero(c, 'no te lo vuelve a preguntar', 160, 160, VERDE, 9.5);
    },
  },
  { // 8. Los tokens que se van
    problema: (c, q) => {
      actorModelo(c, 160, 62, 14); letrero(c, 'el modelo', 160, 40, MODELO, 9);
      const leyendo = Math.floor(q * 14) % 6;
      for (let k = 0; k < 6; k++) {
        const x = 40 + k * 48;
        caja(c, x - 18, 118, 36, 24, k === leyendo ? ROJO : '#8f8a7d', 0.12, 4); letrero(c, 'archivo', x, 133, LUZ, 7);
        if (k === leyendo) trazo(c, 160, 76, x, 118, ROJO, 0.8);
      }
      letrero(c, `${Math.round(q * q * 184000).toLocaleString('es')} tokens`, 304, 28, ROJO, 11, 'right');
      if (q > 0.6) letrero(c, 'lee lo mismo una y otra vez', 160, 166, ROJO, 9.5);
    },
    solucion: (c, q) => {
      actorStudio(c, 16, 40, 70, 50, false); letrero(c, 'el Studio', 51, 34, MORADO, 9);
      actorDirector(c, 160, 64, 12); letrero(c, 'el director', 160, 44, ORO, 9);
      const k = tramo(q, 0.05, 0.3);
      caja(c, lerp(31, 136, k), lerp(57, 84, k), 48, 16, ORO, 0.3, 5); letrero(c, 'todo junto', lerp(55, 160, k), lerp(68, 95, k), '#fffaf0', 7.5);
      for (let j = 0; j < 6; j++) {
        const x = 40 + j * 48, cambio = j === 1 || j === 4;
        caja(c, x - 18, 118, 36, 24, cambio ? VERDE : '#5b6482', cambio ? 0.2 : 0.06, 4);
        letrero(c, cambio ? 'cambió' : 'igual', x, 133, cambio ? '#dff5e8' : '#8f8a7d', 7);
        if (cambio && q > 0.35) trazo(c, 160, 104, x, 118, VERDE, tramo(q, 0.35, 0.5));
      }
      letrero(c, `${Math.round(tramo(q, 0.3, 0.9) * 21000).toLocaleString('es')} tokens`, 304, 28, VERDE, 11, 'right');
      if (q > 0.8) letrero(c, 'en «Modelo y consumo»', 304, 44, LUZ, 8, 'right');
    },
  },
  { // 9. Vuelves de una pausa y no sabes en qué ibas ni qué sigue: junta «en qué ibas» y «qué sigue al volver de un
    // descanso», que se repetían (pd_fusion_olvidadizo; el reparto aprobado, nmw5chos7tit, y su guion, nmw5cks5utit)
    problema: (c, q) => {
      bola(c, 272, 40, 14, '#e8e4d6'); bola(c, 279, 35, 12, '#121829'); letrero(c, 'otro día', 272, 70, LUZ, 9);
      ventana(c, 40, 30, 180, 100, 'sesión nueva', '#8f8a7d');
      if (Math.floor(q * 8) % 2) { c.fillStyle = LUZ; c.fillRect(54, 48, 2, 10); }
      actorDev(c, 130, 158, 1.3);
      if (q > 0.3) letrero(c, '?', 152, 152, ROJO, 18);
      if (q > 0.3) letrero(c, '¿en qué iba?', 262, 112, ROJO, 10);
      if (q > 0.55) letrero(c, '¿y qué sigue?', 262, 132, ROJO, 10);
    },
    solucion: (c, q) => {
      caja(c, 70, 20, 180, 120, ORO, 0.08); letrero(c, '¿Dónde quedamos?', 160, 37, ORO, 10.5);
      ['Lo que se hizo', 'Dónde quedó el proyecto', 'Lo nuevo desde tu visita'].forEach((t, k) => {
        c.save(); c.globalAlpha *= tramo(q, 0.1 + k * 0.13, 0.2 + k * 0.13); letrero(c, `· ${t}`, 84, 58 + k * 18, LUZ, 9, 'left'); c.restore();
      });
      // Una sola misión siguiente a la vista, y solo retomas
      if (q > 0.54) placaMision(c, 100, 112, 120, 'Tu misión siguiente', q > 0.84, tramo(q, 0.54, 0.62));
      actorDev(c, lerp(30, 80, tramo(q, 0.7, 0.84)), 122, 1.2);
      if (q > 0.86) letrero(c, 'solo retomas: ya sabes qué sigue', 160, 160, VERDE, 9.5);
    },
  },
  null,   // 10. (Salió: «qué sigue al volver de un descanso» se juntó con la 9 en «Hilo perdido», pd_fusion_olvidadizo; su lugar se queda vacío para que los demás segmentos conserven las claves de su voz)
  { // 11. Explicar otra vez el proyecto
    problema: (c, q) => {
      const s = Math.min(2, Math.floor(q * 3)), k = (q * 3) % 1;
      // Una sesión tras otra, cada una en lugar de la anterior: ya no se apilan una encima de otra (nmw5d6iqctit)
      ventana(c, 38, 32, 200, 110, `sesión ${s + 1}`, ROJO);
      const x0 = 38, y0 = 32;
      globo(c, x0 + 10, y0 + 22, 'Mi proyecto es…', CIAN);
      renglones(c, x0 + 12, y0 + 46, 170, Math.max(1, Math.round(1 + k * 6)), '#9fd8ff', 1, 8);
      actorDev(c, 272, 124, 1.4);
      if (s > 0) letrero(c, 'otra vez', 274, 98, ROJO, 11);
    },
    solucion: (c, q, tinta) => DE_ANTES[2](c, q, tinta),
  },
  { // 12. El contexto que se contamina: una decisión vieja se cuela
    problema: (c, q) => {
      ventana(c, 30, 14, 236, 150, 'el historial del chat, o una búsqueda');
      globo(c, 44, 30, 'Usemos Google para entrar', ORO, false, 0.8);
      letrero(c, 'hace dos semanas', 262, 41, '#8f8a7d', 7.5, 'right');
      globo(c, 44, 66, 'Cambiamos: sin Google', CIAN, false, 0.9);
      if (q > 0.25) lupa(c, lerp(230, 214, tramo(q, 0.25, 0.5)), lerp(110, 46, tramo(q, 0.25, 0.5)), 6);
      // El resaltado, justo alrededor del globo viejo, y la respuesta del modelo, dentro de la ventana (nmw5d6iqctit)
      if (q > 0.5) caja(c, 40, 26, 139, 23, ROJO, 0.12, 8);
      actorModelo(c, 290, 112, 11);
      if (q > 0.62) globo(c, 260, 98, 'Hice el inicio con Google', ROJO, true);
      if (q > 0.8) letrero(c, 'una decisión vieja se coló', 160, 156, ROJO, 9.5);
    },
    solucion: (c, q) => {
      const vieja = tramo(q, 0.12, 0.3);
      // «Reemplazado» va dentro de su tarjeta, debajo de lo tachado, sin pisar su borde (nmw5d6iqctit)
      caja(c, 24, 34, 140, 36, '#8f8a7d', 0.08); letrero(c, 'Usemos Google', 36, 50, vieja > 0.5 ? '#8f8a7d' : LUZ, 9.5, 'left');
      if (q > 0.12) { trazo(c, 34, 47, 108, 47, ROJO, vieja); caja(c, 94, 52, 64, 14, NARANJA, 0.3, 7); letrero(c, 'Reemplazado', 126, 62, '#fff1de', 8.5); }
      caja(c, 24, 94, 140, 36, ORO, 0.12); letrero(c, 'En vigor', 94, 90, ORO, 8.5); letrero(c, 'Sin Google', 36, 116, '#fffaf0', 9.5, 'left');
      actorDirector(c, 246, 82, 12); letrero(c, 'el director', 246, 62, ORO, 9);
      if (q > 0.45) { trazo(c, 236, 88, 168, 108, VERDE, tramo(q, 0.45, 0.55)); palomita(c, 150, 100, 5, tramo(q, 0.5, 0.6)); }
      if (q > 0.6) { trazo(c, 236, 76, 168, 54, ROJO, 0.55 * tramo(q, 0.6, 0.7), true); cruz(c, 202, 65, 4, tramo(q, 0.65, 0.75)); }
      if (q > 0.82) letrero(c, 'al modelo, solo lo que aprobaste', 160, 160, VERDE, 9.5);
    },
  },
  { // 13. El modelo, una caja negra (nmw27jyxjtit): y con STL, el ciclo de inferencia dibujado
    problema: (c, q) => {
      actorDev(c, 46, 96, 1.4);
      caja(c, 150, 40, 120, 100, '#3a3f55', 0.7, 10);
      actorModelo(c, 210, 90, 14, 0.25 + 0.2 * Math.sin(q * 12) ** 2);
      letrero(c, 'el modelo', 210, 32, MODELO, 9);
      const k = tramo(q, 0.05, 0.35);
      if (k < 1) globo(c, lerp(62, 150, k), 84, 'Haz esto', CIAN, false, 1 - k * 0.6);
      [0, 1, 2].forEach((m) => { if (q > 0.35 + m * 0.12) letrero(c, '?', 172 + m * 38, 66 + (m % 2) * 46, ROJO, 14); });
      if (q > 0.7) letrero(c, '¿qué recuerda, qué no y por qué?', 160, 166, ROJO, 9.5);
    },
    // Con STL, un chat dibujado entre el director y el modelo, como el avance de la revisión del director (nmw5cyd6otit): a
    // la izquierda el director y a la derecha el modelo, sus globos llegan uno a uno, «El director solicita…» y «El modelo
    // responde…»; mientras espera, su globo dice «El director espera al modelo» con un reloj que corre; abajo, los tokens de
    // entrada y de salida suben con cada globo; al final, los globos se pliegan en el historial. Es un dibujo, no una
    // revisión real: no muestra nada de ningún proyecto
    solucion: (c, q) => {
      actorDirector(c, 38, 46, 11); letrero(c, 'el director', 38, 72, ORO, 8);
      actorModelo(c, 282, 46, 10); letrero(c, 'el modelo', 282, 72, MODELO, 8);
      const historial = tramo(q, 0.86, 0.94);
      if (q < 0.86) {
        // Los globos, de arriba abajo: lo que pide el director (a la izquierda) y lo que responde el modelo (a la derecha)
        const espera = (desde, hasta, y) => {
          if (q <= desde || q >= hasta) return;
          const s = Math.round(lerp(1, 38, tramo(q, desde, hasta)));
          globo(c, 64, y, `El director espera al modelo · ${s} s`, '#8f8a7d', false, 0.9);
          relojito(c, 250, y + 7.5, 5, tramo(q, desde, hasta));
        };
        if (q > 0.04) globo(c, 64, 24, 'El director solicita: lo que cambió', CIAN, false, tramo(q, 0.04, 0.1));
        espera(0.1, 0.24, 44);
        if (q >= 0.24) globo(c, 256, 44, 'El modelo responde: 3 archivos', VERDE, true, tramo(q, 0.24, 0.3));
        if (q > 0.5) globo(c, 64, 64, 'El director solicita: las pruebas', CIAN, false, tramo(q, 0.5, 0.56));
        espera(0.56, 0.68, 84);
        if (q >= 0.68) globo(c, 256, 84, 'El modelo responde: todas pasan', VERDE, true, tramo(q, 0.68, 0.74));
      } else {
        // Y se pliegan en el historial, para auditarlo y aprender
        c.save(); c.globalAlpha *= historial;
        ventana(c, 64, 22, 192, 78, 'el historial: cada paso, auditable', ORO);
        ['solicita: lo que cambió', 'responde: 3 archivos', 'solicita: las pruebas', 'responde: todas pasan'].forEach((t, k) => {
          letrero(c, t, 76, 46 + k * 14, LUZ, 8, 'left'); palomita(c, 240, 43 + k * 14, 3.5);
        });
        c.restore();
      }
      // Los tokens de entrada y de salida, que suben con cada globo, como en el panel de avance
      const entrada = Math.round(lerp(0, 9800, tramo(q, 0.04, 0.12)) + lerp(0, 4300, tramo(q, 0.5, 0.58)));
      const salida = Math.round(lerp(0, 1900, tramo(q, 0.24, 0.32)) + lerp(0, 800, tramo(q, 0.68, 0.76)));
      if (q > 0.34) letrero(c, 'la caja negra, a la vista', 160, 168, LUZ, 8.5);
      caja(c, 64, 108, 92, 30, CIAN, 0.12, 6); letrero(c, 'tokens de entrada', 110, 119, CIAN, 7.5); letrero(c, entrada.toLocaleString('es'), 110, 133, '#fffaf0', 10);
      caja(c, 164, 108, 92, 30, VERDE, 0.12, 6); letrero(c, 'tokens de salida', 210, 119, VERDE, 7.5); letrero(c, salida.toLocaleString('es'), 210, 133, '#fffaf0', 10);
    },
  },
  { // 14. Se cae el internet: el Buzón sigue recogiendo y tú sigues leyendo y auditando, sin conexión (sexto problema; su voz espera el «Confirmo»)
    problema: (c, q) => {
      ventana(c, 30, 22, 260, 140, 'el chat con el modelo');
      actorDev(c, 52, 140, 1.3);
      const cae = tramo(q, 0.35, 0.5);
      actorModelo(c, 262, 52, 9, 1 - 0.7 * cae);
      if (q > 0.06) globo(c, 70, 112 - tramo(q, 0.06, 0.3) * 60, 'Sigue con el login', CIAN);
      if (q > 0.3 && q < 0.5) globo(c, 250, 76, 'Escribiendo…', MODELO, true, 0.6 + 0.4 * Math.sin(q * 30) ** 2);
      // El corte: la señal con su raya y el chat quieto
      if (q > 0.35) { wifi(c, 160, 100, ROJO, true, cae); letrero(c, 'sin conexión', 160, 134, ROJO, 10); cruz(c, 262, 52, 4, cae); }
      if (q > 0.7) letrero(c, 'el chat se congeló: ¿y ahora qué?', 160, 156, ROJO, 9.5);
    },
    solucion: (c, q) => {
      // Sin conexión hasta casi el final, cuando vuelve
      const vuelve = tramo(q, 0.86, 0.92), color = vuelve > 0.5 ? VERDE : ROJO;
      wifi(c, 34, 24, color, vuelve < 0.5); letrero(c, vuelve > 0.5 ? 'conexión' : 'sin conexión', 34, 50, color, 8);
      actorDev(c, 36, 112, 1.2); letrero(c, 'tú', 36, 136, '#cfe0ff', 8.5);
      actorStudio(c, 86, 62, 110, 78, false); letrero(c, 'Buzón del Studio', 141, 56, MORADO, 9);
      // Tus notas, ajustes y entregas llegan al Buzón aunque no haya internet
      [['nota', CIAN], ['ajuste', NARANJA], ['entrega', ORO]].forEach(([texto, color], k) => {
        const a = 0.2 + k * 0.06, u = tramo(q, a, a + 0.12);
        if (q > a) { c.save(); c.globalAlpha *= Math.min(1, u * 3); caja(c, lerp(40, 100, u), lerp(104, 70 + k * 22, u), 82, 15, color, 0.3, 6); letrero(c, texto, lerp(40, 100, u) + 41, lerp(104, 70 + k * 22, u) + 10.5, '#fffaf0', 8.5); c.restore(); }
      });
      // Sigues leyendo un documento, con su «Entendido»
      if (q > 0.4) {
        const a = tramo(q, 0.4, 0.46);
        c.save(); c.globalAlpha *= a;
        ventana(c, 214, 50, 96, 52, 'documento', ORO);
        renglones(c, 222, 69, 78, 2, 'rgba(255, 255, 255, .35)', 1, 7);
        c.fillStyle = ORO; c.beginPath(); c.roundRect(224, 84, 62, 14, 7); c.fill(); letrero(c, 'Entendido', 255, 94.5, '#1a1f33', 8.5);
        c.restore();
        if (q > 0.52) palomita(c, 298, 91, 4, tramo(q, 0.52, 0.56));
      }
      // O auditas el trabajo del modelo en su historial
      if (q > 0.58) {
        c.save(); c.globalAlpha *= tramo(q, 0.58, 0.64);
        ventana(c, 214, 108, 96, 52, 'historial', MORADO);
        for (let k = 0; k < 3; k++) { renglones(c, 222, 122 + k * 12, 56, 1, 'rgba(255, 255, 255, .35)'); palomita(c, 298, 124 + k * 12, 3.5, tramo(q, 0.62 + k * 0.04, 0.68 + k * 0.04)); }
        c.restore();
      }
      if (q > 0.74) letrero(c, 'nada se pierde: queda en la memoria del proyecto', 160, 172, VERDE, 9);
      // Vuelve la conexión: el director lo recibe todo junto y habla con el modelo
      if (q > 0.86) {
        const u = tramo(q, 0.88, 0.95);
        actorDirector(c, 141, 30, 9); letrero(c, 'el director', 154, 33, ORO, 8.5, 'left');
        [CIAN, NARANJA, ORO].forEach((col, k) => bola(c, 133 + k * 8, lerp(76, 44, u), 3.5, col, 0.4 + 0.6 * u));
        actorModelo(c, 300, 24, 8); letrero(c, 'el modelo', 300, 40, MODELO, 8);
        if (q > 0.94) { trazo(c, 206, 30, 290, 25, VERDE, tramo(q, 0.94, 0.98)); letrero(c, 'todo junto', 248, 20, VERDE, 8.5); }
      }
    },
  },
  { // 15. El cansancio de escribir: dictas tu nota (pd_dictado; su guion, confirmado el 6 de noviembre de 2026, nmw4f8wietit;
    // «cansa» en vez de «pereza», que Kai pronunciaba mal, nmw56lwtbtit; y «hablas como hablarías», ampliado, nmw56n724tit)
    problema: (c, q) => {
      // Nada se sale de la ventana ni pisa otra cosa (la regla del titular, nmw5d6iqctit): la tarjeta de la idea va adentro,
      // y «le llega la mitad», debajo del globo y lejos de «escribirlo todo…»
      ventana(c, 30, 22, 260, 140, 'el chat con el modelo');
      // Tu idea, entera, en la cabeza: la bombilla y sus renglones
      actorDev(c, 60, 136, 1.3);
      caja(c, 40, 36, 104, 58, ORO, 0.1, 12);
      iconoNota(c, 'idea', 56, 54, 1.1);
      renglones(c, 72, 48, 60, 4, 'rgba(255, 241, 196, .55)', 1, 10);
      // Escribirla toda cansa: el teclado avanza despacio, y sale solo la mitad
      if (q > 0.3) {
        const escrito = tramo(q, 0.3, 0.62);
        caja(c, 96, 124, 92, 22, '#8f8a7d', 0.1, 5);
        for (let k = 0; k < 8; k++) bola(c, 105 + k * 10.5, 135, 2.6, k < escrito * 4 ? ROJO : 'rgba(255, 255, 255, .3)');
        letrero(c, 'escribirlo todo…', 142, 117, '#ffc2cf', 8.5);
      }
      actorModelo(c, 262, 52, 9);
      if (q > 0.66) {
        globo(c, 156, 66, 'Haz que el botón…', ROJO, false, tramo(q, 0.66, 0.74));
        letrero(c, 'le llega la mitad', 202, 97, ROJO, 8.5);
        cruz(c, 262, 52, 4, tramo(q, 0.74, 0.8));
      }
    },
    solucion: (c, q) => {
      // Hablas como hablarías con un amigo, incluso divagando (nmw56n724tit): el micrófono y sus ondas, mientras hablas
      actorDev(c, 38, 108, 1.3, q > 0.82);
      microfono(c, 70, 98, VERDE_DICTADO);
      if (q < 0.52) for (const r of [8, 13, 18]) { c.save(); c.globalAlpha *= 0.3 + 0.7 * Math.sin(q * 40 - r) ** 2; c.strokeStyle = VERDE_DICTADO; c.lineWidth = 1.4; c.beginPath(); c.arc(70, 92, r, -0.9, 0.9); c.stroke(); c.restore(); }
      // Se transcribe en tu computador
      if (q > 0.5) { letrero(c, 'se transcribe en tu computador', 104, 150, VERDE_DICTADO, 8.5, 'left'); caja(c, 96, 140, 6, 6, VERDE_DICTADO, 0.4, 2); }
      // Tu nota, en el Buzón: la lees y la corriges antes de que salga
      actorStudio(c, 108, 40, 120, 92, false); letrero(c, 'Buzón del Studio', 168, 34, MORADO, 9);
      const escrita = tramo(q, 0.1, 0.56);
      caja(c, 118, 52, 100, 70, VERDE_DICTADO, 0.1, 7);
      letrero(c, 'tu nota', 124, 62, VERDE_DICTADO, 7.5, 'left');
      for (let k = 0; k < 4; k++) {
        const visible = escrita * 4 > k;
        if (!visible) continue;
        const quitada = k === 2 && q > 0.78, agregada = k === 3;
        if (agregada && q < 0.88) continue;
        renglones(c, 124, 70 + k * 12, k === 3 ? 60 : 84, 1, agregada ? VERDE : 'rgba(255, 255, 255, .45)', quitada ? 0.35 : 1);
        if (quitada) trazo(c, 122, 71.5 + k * 12, 210, 71.5 + k * 12, ROJO, tramo(q, 0.78, 0.84));
        if (agregada) letrero(c, '+', 196, 76 + k * 12, VERDE, 9, 'left');
      }
      if (q > 0.74) { lupa(c, 214, 58, 6); letrero(c, 'la lees y la corriges', 168, 138, '#fffaf0', 8.5); }
      // Y solo entonces la recibe el modelo
      actorModelo(c, 284, 76, 9);
      if (q > 0.93) { const u = tramo(q, 0.93, 0.99); bola(c, lerp(222, 274, u), 86, 3.5, VERDE, 0.5 + 0.5 * u); if (u > 0.95) palomita(c, 284, 100, 4); }
    },
  },
];
// Los cinco grandes problemas, en el orden de la lista de la estación 2 (data-resuelve): de cada uno, qué segmentos junta
// (su lugar en SEGMENTOS, de 0), con los guiones del titular del 4 de noviembre: 1: la atención (varias sesiones, la idea
// que se cuela; nmw24lltqtit); 2: lo que dices (mensaje incompleto, pregunta ya decidida; nmw262jl0tit); 3: al volver
// (qué sigue después de un descanso y el contexto que se contamina con cada cambio de decisión, las dos terceras
// situaciones de antes, que pasan aquí; nmw26lr5jtit); 4: leer y releer (respuestas largas, qué ya leíste, releer;
// nmw26xb5ltit); 5: el modelo olvida (tokens, en qué ibas, explicar otra vez y la caja negra; nmw27jyxjtit). «Tienes que
// estar encima», la decisión enterrada y la memoria aparte salieron: los agentes de chat ya lo resuelven, o lo dice otro.
// El sexto, sin internet; y el séptimo, el cansancio de escribir, que se resuelve dictando (pd_dictado, nmw4f73aftit)
// Desde el 6 de noviembre (pd_fusion_olvidadizo; el reparto, nmw5chos7tit): ninguno pasa de tres situaciones. El 3, «Hilo
// perdido», en el lugar de «Contexto enredado»: volver de una pausa sin saber en qué ibas ni qué sigue (la 9, que junta la 9
// y la 10 de antes) y explicarlo todo otra vez; el 5, «Modelo olvidadizo»: los tokens, el contexto que se contamina y la
// caja negra, contada como un chat entre el director y el modelo (nmw5cyd6otit)
const GRANDES = [[1, 2], [0, 6], [8, 10], [3, 4, 5], [7, 11, 12], [13], [14]];
// Lo que todavía no tiene voz, mientras un problema nuevo espera el «Confirmo» de la suya: sus segmentos (de 0) y sus
// enunciados. Sus rótulos duran lo que dice la estimación (tardaVoz), no se pide ni suena ningún mp3 suyo (nada de 404) y
// el reloj del clip nunca espera a una voz. tools/vozRecorrido.ts lo repite (SIN_VOZ_TODAVIA) para que el generador no lo
// toque. El sexto (segmento 14, de 0 en 13, y su enunciado g6-e) ya tiene su «Confirmo» (nmw2slvaatit) y espera solo a
// que Google deje generar sus clips: la cuota del día de la clave se acabó el 4 de noviembre
const SIN_VOZ_TODAVIA = new Set([]);
const ENUNCIADOS_SIN_VOZ_TODAVIA = new Set([]);
// Y los clips sueltos que ya tienen su «Confirmo» pero no su mp3, porque la cuota del día de Google se acabó (nmw2xuhhgtit:
// de a un día); tools/vozRecorrido.ts --confirmo los genera cuando vuelve la cuota, y entonces salen de aquí. Hoy, ninguno:
// el 6 de noviembre de 2026 salieron los del dictado, con su texto nuevo, y los ocho de «Cómo empezar»
// Desde el 6 de noviembre en la tarde, los cinco de «Hilo perdido» y «Modelo olvidadizo» (pd_fusion_olvidadizo): sus dos
// enunciados, las dos frases en rojo de volver de una pausa y «con una sola misión siguiente a la vista:», que esperan su
// «Confirmo» (t_confirma_voz_hilo); hasta entonces, sus rótulos duran lo que dice la estimación
const CLAVES_SIN_VOZ_TODAVIA = new Set(['g3-e', 'g5-e', 's9-p1', 's9-p2', 's9-4']);
const sinVozTodavia = (clave) => {
  const seg = /^s(\d+)-/.exec(clave);
  return ENUNCIADOS_SIN_VOZ_TODAVIA.has(clave) || CLAVES_SIN_VOZ_TODAVIA.has(clave) || (seg != null && SIN_VOZ_TODAVIA.has(Number(seg[1]) - 1));
};
// Cuánto dura cada clip, en segundos: su enunciado y después cada situación en rojo seguida de su solución, segmento
// tras segmento, cada parte lo que tarda su voz; «Cómo empezar» (GUIA), sus escenas
const duraClip = (i) => (i === GUIA ? duraComo() : enunciadoSeg(i) + (GRANDES[i] ?? GRANDES[0]).reduce((s, j) => s + segmentoSeg(j), 0));
// La clave de la voz del enunciado de cada gran problema: g<problema>-e (tools/vozRecorrido.ts la saca de su <summary>)
const claveEnunciado = (i) => `g${(GRANDES[i] ? i : 0) + 1}-e`;
// Lo que dice cada paso de cada segmento, abajo, mientras pasa: los del problema, en rojo, y los de la solución, cada uno
// desde qué parte de ella (de 0 a 1). Son los guiones del titular, frase por frase, cortados donde la voz hace su pausa
const PASOS_SEG = [
  { problema: [[0, 'Si enviaste y le faltaba algo,'], [0.4, 'envías otro y otro para corregir,'], [0.72, 'multiplicando tu consumo de tokens']], solucion: [[0, 'Con STL, tus notas van primero a un buzón:'], [0.3, 'ahí esperan, y puedes revisarlas y editarlas cuanto quieras'], [0.68, 'antes de que el director las envíe realmente al modelo']] },
  { problema: [[0, 'Con cuatro o más sesiones a la vez,'], [0.35, 'tu atención se divide'], [0.6, 'y te agotas tratando de seguirlas todas']], solucion: [[0, 'Con STL, todo entra por un solo canal'], [0.35, 'y se organiza automáticamente'], [0.55, 'para que te enfoques solo'], [0.72, 'en el siguiente paso estratégico, uno a la vez']] },
  { problema: [[0, 'Cuando surgen ideas o ajustes a mitad de algo,'], [0.5, 'lo otro se va quedando atrás y se pierde']], solucion: [[0, 'Con STL, tu idea va al Buzón,'], [0.18, 'el director le da su lugar en la ruta'], [0.36, 'y, si no es estratégico hacerlo ahora, espera en su fase.'], [0.6, 'Así terminas lo que ibas a hacer primero,'], [0.76, 'sin perder esa idea o ajuste nuevo,'], [0.88, 'y este queda en la ruta donde debe ir']] },
  { problema: [[0, 'Leer tres páginas seguidas de una respuesta agota,'], [0.3, 'y la atención se va.'], [0.45, 'Terminas por no leer lo que el modelo responde'], [0.75, 'y solo le dices «sí» a todo']], solucion: [[0, 'STL te presenta una idea a la vez,'], [0.14, 'con un botón de «Entendido» antes de destapar la siguiente.'], [0.36, 'Lo que sigue espera tapado hasta que llegas.'], [0.54, 'Además, te lo puede leer en voz alta,'], [0.68, 'y puedes comentar cada idea o párrafo'], [0.82, 'sin explicarle al modelo a qué parte te refieres']] },
  { problema: [[0, '¿Cómo saber qué ya leíste y qué no?']], solucion: [[0, 'Con STL, cada idea leída queda marcada'], [0.4, 'y sabes justo por dónde vas:'], [0.7, 'qué has leído y qué no']] },
  { problema: [[0, '¿El modelo cambia documentos y te pide releerlos?']], solucion: [[0, 'Con STL, lo que ya leíste queda sellado;'], [0.3, 'lo nuevo llega aparte, en un documento corto,'], [0.65, 'solo con lo que cambió, y fácil de leer']] },
  { problema: [[0, '¿El modelo te pregunta algo que ya decidiste antes?']], solucion: [[0, 'STL tiene su propio sistema de memoria del proyecto:'], [0.16, 'lo que decidiste queda en firme,'], [0.3, 'y, antes de preguntarte, el director busca.'], [0.55, 'Ya estaba decidido: la opción A.'], [0.8, 'No te lo vuelve a preguntar']] },
  { problema: [[0, 'Cada sesión nueva relee lo mismo,'], [0.5, 'y se evaporan los tokens']], solucion: [[0, 'Con STL, el director recibe todo junto, con el mapa,'], [0.4, 'y lee solo lo que cambió,'], [0.62, 'optimizando el consumo de tokens de entrada']] },
  { problema: [[0, '¿Vuelves de una pausa,'], [0.4, 'y no sabes en qué ibas ni qué sigue en cada sesión?']], solucion: [[0, 'Con STL, te espera lista la sección «¿Dónde quedamos?»:'], [0.2, 'un reporte siempre al día de lo que se hizo'], [0.38, 'y de dónde quedó el proyecto,'], [0.54, 'con una sola misión siguiente a la vista:'], [0.78, 'solo retomas, y ya sabes qué sigue']] },
  { problema: [], solucion: [] },   // 10. (salió: se juntó con la 9)
  { problema: [[0, '¿Cada sesión nueva, le explicas otra vez todo'], [0.55, 'para definir de qué irá?']], solucion: [[0, 'STL genera su propio sistema optimizado'], [0.2, 'de memoria del proyecto:'], [0.36, 'el estado queda en archivos, en tu mapa del proyecto'], [0.6, 'y en todo lo que dijiste.'], [0.76, 'El director ya lo sabe todo: no necesitas repetirle nada']] },
  { problema: [[0, '¿Tu contexto se contamina'], [0.4, 'con los cambios frecuentes de decisión?']], solucion: [[0, 'Con STL, la decisión que cambias queda reemplazada en el historial'], [0.4, 'y ya no forma parte del nuevo contexto que va al modelo:'], [0.72, 'solo envías decisiones aprobadas por ti']] },
  { problema: [[0, 'El modelo es una caja negra:'], [0.4, 'a veces no sabes qué recuerda, qué no y por qué']], solucion: [[0, 'STL te presenta, de forma gráfica, todo el ciclo de inferencia:'], [0.2, 'cómo se comunican tu equipo y el modelo,'], [0.34, 'cuánto tarda cada uno en ejecutar sus partes y su consumo,'], [0.52, 'y qué le pide exactamente quién a quién.'], [0.68, 'Así entiendes qué pasa cada vez que le pides algo al modelo'], [0.85, 'y quedas con este historial, para auditarlo y aprender']] },
  { problema: [[0, 'Se cae el internet a mitad de tu trabajo,'], [0.45, 'y el chat con el modelo se detiene: ¿y ahora qué?']], solucion: [[0, 'Con STL Studio, sigues trabajando sin conexión:'], [0.2, 'el Buzón recoge tus notas, ajustes y entregas,'], [0.4, 'y sigues leyendo documentos y respuestas'], [0.58, 'o auditando el trabajo del modelo.'], [0.74, 'Nada se pierde: todo queda en la memoria del proyecto.'], [0.88, 'Al volver la conexión, el director lo recibe todo junto.']] },
  { problema: [[0, 'Tienes la idea clara en la cabeza,'], [0.36, 'pero escribirla entera cansa,'], [0.66, 'y al modelo le llega solo la mitad.']], solucion: [[0, 'Con STL, la dictas: hablas como hablarías con un amigo,'], [0.1, 'de forma natural, explicándole lo que tienes en mente.'], [0.2, 'Incluso puedes divagar, no importa: el director te entenderá bien.'], [0.32, 'Lo importante es que expreses tu idea como de verdad la quieres,'], [0.42, 'con tu lenguaje natural: la comprensión, déjasela al director.'], [0.52, 'Tu nota se transcribe en tu computador.'], [0.62, 'Como va al Buzón y no directo al modelo,'], [0.74, 'la lees y la corriges antes de que llegue:'], [0.86, 'le quitas o le agregas lo que quieras.']] },
];
// El cierre de cada segmento (nota de voz nmw3ruscptit): al terminar su solución, y antes del problema siguiente, unos dos
// segundos con un ✓, el problema que quedó resuelto, en corto, tu cubito sonriendo y una frase de cierre con su voz, que
// dice cómo STL te libera de ese problema. Así no se encadenan solución y problema seguidos. Es el patrón de toda animación
// explicativa del recorrido: el problema, cómo lo resuelve STL y su cierre. Cada uno: [lo resuelto, la frase de su voz],
// con su clip s<segmento>-c (tools/vozRecorrido.ts)
const CIERRES = [
  ['Los mensajes a medias', 'Adiós a corregir mensajes a medias: lo revisas antes de que salga.'],
  ['Tu atención dividida', 'Libre de tantas sesiones: tu atención, en un solo paso.'],
  ['Las ideas que se perdían', 'Ninguna idea se pierde, y terminas lo que empezaste.'],
  ['Las respuestas que agotan', 'Leer ya no agota: una idea a la vez.'],
  ['No saber qué ya leíste', 'Siempre sabes por dónde vas.'],
  ['Releer lo que ya leíste', 'Nunca más releer lo que ya leíste.'],
  ['Las preguntas repetidas', 'Lo que decidiste queda decidido.'],
  ['Los tokens que se evaporan', 'Tus tokens, solo para lo nuevo.'],
  ['No saber en qué ibas ni qué sigue', 'Retomas justo donde quedaste.'],
  null,   // 10. (salió: se juntó con la 9)
  ['Explicarlo todo otra vez', 'Sin repetirle nada al modelo.'],
  ['Un contexto contaminado', 'Un contexto limpio, solo con lo que aprobaste.'],
  ['El modelo, una caja negra', 'La caja negra, ahora a la vista.'],
  ['Sin internet, todo se detenía', 'Sin internet, tu trabajo sigue.'],
  ['El cansancio de escribir', 'Hablas, corriges y envías: sin escribir de más.'],
];
// Lo que dura el cierre: al menos CIERRE_SEG (cuatro segundos, para que se alcance a leer el ✓, el problema resuelto y la
// frase de Kai; nota de voz del 5 de noviembre), y si su voz tarda más, lo que tarda con un respiro
const CIERRE_SEG = 4;
const claveDeCierre = (j) => `s${j + 1}-c`;
const cierreSeg = (j) => {
  const clave = claveDeCierre(j);
  return Math.max(CIERRE_SEG, PISTA_VOZ_ES[clave] == null ? tardaVoz(CIERRES[j]?.[1] ?? '') : segDeVoz(clave) + RESPIRO_FRASE + 0.4);
};
// Un segmento entero: su situación en rojo, su solución y su cierre
const segmentoSeg = (j) => problemaSeg(j) + solucionSeg(j) + cierreSeg(j);

// ── «Cómo empezar», la estación 3 (pd_como_empezar, en lugar de «¿Reemplaza a otros métodos?», nmw47ga2wtit): una sola
// animación, en el mismo reproductor de los problemas y con sus mismos mandos (nmw4ircrjtit, nmw4irz3etit), que se abre sola
// al llegar. Su guion, confirmado el 6 de noviembre de 2026 tal como está (nmw4f5xg4tit): siete escenas y su cierre, cada
// una con su clip de Kai (como-1 … como-7 y como-c, tools/vozRecorrido.ts); cada escena dura lo que su voz, con un mínimo
// para alcanzar a verla. GUIA es su lugar en el reproductor: no es un problema de la estación 2
const GUIA = 100;
const GUION_COMO = {
  escenas: [
    '¿Quieres probar el Studio ahora? Así se empieza.',
    'Primero, tráelo a tu computador: clona el repositorio, o descárgalo desde GitHub.',
    'Ponlo en la carpeta donde quieras trabajar.',
    'Para tu tranquilidad, pídele primero a tu modelo un escaneo de seguridad: que confirme que no trae nada malicioso.',
    'Después, pídele que lo instale.',
    'Desde ahí, el Studio te guía paso a paso.',
    'Si te queda alguna duda, consulta la documentación.',
  ],
  cierre: 'Listo: ya estás en marcha.',
};
// Lo que se le pide al modelo en las escenas del escaneo y de la instalación (de 0: la 3 y la 4), debajo de la animación como
// un ejemplo, en texto y sin «Copiar» (nmw56hkz8tit, que reemplaza a nmw4f6alqtit), y el enlace de la última, al README del repositorio en GitHub (nmw4f6lictit); la
// ventana a la que se le pide se llama «Claude Code» (nmw4irns1tit)
const PEDIDOS_COMO = { 3: 'Revisa este repositorio y dime si trae algo malicioso antes de instalarlo', 4: 'Inicializa STL Studio' };
const ENLACE_COMO = 'https://github.com/ARGWABOT/STL-Sacred_Time_Line#readme';
const VENTANA_COMO = 'Claude Code';
const ESCENA_SEG = 4.5, ESCENA_PEDIDO_SEG = 6.5;
const nComo = () => GUION_COMO.escenas.length + 1;   // las siete escenas y su cierre
const claveDeComo = (k) => (k < GUION_COMO.escenas.length ? `como-${k + 1}` : 'como-c');
const textoDeComo = (k) => GUION_COMO.escenas[k] ?? GUION_COMO.cierre;
const escenaSeg = (k) => {
  const clave = claveDeComo(k);
  const voz = PISTA_VOZ_ES[clave] == null ? tardaVoz(textoDeComo(k)) : segDeVoz(clave) + RESPIRO_FRASE + 0.4;
  return Math.max(PEDIDOS_COMO[k] ? ESCENA_PEDIDO_SEG : k === nComo() - 1 ? CIERRE_SEG : ESCENA_SEG, voz);
};
const duraComo = () => Array.from({ length: nComo() }, (_, k) => escenaSeg(k)).reduce((s, x) => s + x, 0);
// En qué escena va en el segundo t: k (de 0; la última es el cierre), cuánto de ella (q), desde qué segundo y su rótulo
function escenaDeComo(t) {
  const s = Math.max(0, Math.min(duraComo(), t));
  let desde = 0, k = 0;
  while (k < nComo() - 1 && s >= desde + escenaSeg(k)) { desde += escenaSeg(k); k++; }
  return { k, desde, q: tope((s - desde) / escenaSeg(k)), p: s / duraComo(), texto: textoDeComo(k), clave: claveDeComo(k) };
}
// En qué paso va el clip i en el segundo t: la situación o la solución que se ve (k de n), cuánto de ella (q), su rótulo y
// la clave de su voz (s<segmento>-p<paso>, cada paso del problema; s<segmento>-<paso>, cada paso de la solución:
// docs/difusion/voz/es/, que genera tools/vozRecorrido.ts con lo mismo que dice el rótulo, nmw1ga4dftit)
function pasoDeClip(i, t) {
  if (i === GUIA) { const e = escenaDeComo(t); return { n: nComo() - 1, p: e.p, enEnunciado: false, enProblema: false, enCierre: e.k === nComo() - 1, k: e.k, q: e.q, j: -1, texto: e.texto, clave: e.clave }; }
  const grupo = GRANDES[i] ?? GRANDES[0], n = grupo.length;
  const dura = duraClip(i), s = Math.min(dura, Math.max(0, t)), p = s / dura;
  // Primero, su enunciado (nmw1olvthtit)
  const e = enunciadoSeg(i);
  if (s < e) return { n, p, enEnunciado: true, enProblema: false, enCierre: false, k: 0, q: s / e, j: grupo[0], texto: ENUNCIADOS[i] ?? '', clave: claveEnunciado(i) };
  // Intercalados (nmw1ktmeatit): la situación 1 en rojo, su solución y su cierre (nmw3ruscptit), luego la 2 y lo suyo, y
  // así. k es cuál de las n situaciones se ve, y q va de 0 a 1 dentro de su problema, de su solución o de su cierre
  let d = s - e, k = 0;
  while (k < n - 1 && d >= segmentoSeg(grupo[k])) { d -= segmentoSeg(grupo[k]); k++; }
  const j = grupo[k], ps = problemaSeg(j), enProblema = d < ps;
  if (d >= ps + solucionSeg(j)) return { n, p, enEnunciado: false, enProblema: false, enCierre: true, k, q: tope((d - ps - solucionSeg(j)) / cierreSeg(j)), j, texto: CIERRES[j]?.[1] ?? '', clave: claveDeCierre(j) };
  const enParte = enProblema ? d : d - ps;
  const q = conPista(j, enProblema) ? qConPista(j, enProblema, enParte) : tope(enParte / (enProblema ? ps : solucionSeg(j)));
  const lista = enProblema ? PASOS_SEG[j].problema : PASOS_SEG[j].solucion;
  const m = Math.max(0, lista.findLastIndex(([desde]) => q >= desde));
  return { n, p, enEnunciado: false, enProblema, enCierre: false, k, q, j, texto: lista[m][1], clave: claveDePaso(j, enProblema, m) };
}
// Todos los rótulos de un clip, en su orden. El primero, el de su enunciado; cada segmento termina con su cierre
const clavesDelGuion = (i) => i === GUIA ? Array.from({ length: nComo() }, (_, k) => claveDeComo(k)) : [claveEnunciado(i), ...(GRANDES[i] ?? GRANDES[0]).flatMap((j) => [...PASOS_SEG[j].problema.map((_, m) => `s${j + 1}-p${m + 1}`), ...PASOS_SEG[j].solucion.map((_, m) => `s${j + 1}-${m + 1}`), claveDeCierre(j)])];
// Todas las voces de un clip, en su orden: para pedirlas antes de que suenen. Las que aún no tienen voz no se piden
const clavesDeClip = (i) => clavesDelGuion(i).filter((clave) => !sinVozTodavia(clave));
// La voz manda (nota de voz nmw2qhhsjtit): el paso del clip i en el segundo t, si su voz es de Google, con su clave, el
// segundo del clip en que empieza y lo que dura su voz en ese reloj; null si no tiene pista. Mientras su clip suena, el
// reloj del clip es el de la voz (desde + lo que lleva dicho), así la animación ni se adelanta ni la hace esperar, a
// cualquier velocidad; al callar, corre sola su respiro hasta el paso siguiente
function tramoDeVoz(i, t) {
  if (i === GUIA) { const e = escenaDeComo(t); return PISTA_VOZ_ES[e.clave] == null ? null : { clave: e.clave, desde: e.desde, voz: segDeVoz(e.clave) }; }
  const grupo = GRANDES[i] ?? GRANDES[0], s = Math.max(0, Math.min(duraClip(i), t));
  const e = enunciadoSeg(i), ce = claveEnunciado(i);
  if (s < e) return PISTA_VOZ_ES[ce] == null ? null : { clave: ce, desde: 0, voz: segDeVoz(ce) };
  let desde = e;
  for (const j of grupo) {
    for (const enProblema of [true, false]) {
      const total = enProblema ? problemaSeg(j) : solucionSeg(j);
      if (s < desde + total) {
        if (!conPista(j, enProblema)) return null;
        const tiempos = tiemposConPista(j, enProblema), k = total / suma(tiempos);
        let va = desde;
        for (let m = 0; m < tiempos.length; m++) {
          if (s < va + tiempos[m] * k || m === tiempos.length - 1) { const clave = claveDePaso(j, enProblema, m); return { clave, desde: va, voz: segDeVoz(clave) }; }
          va += tiempos[m] * k;
        }
      }
      desde += total;
    }
    // Su cierre, con su voz (nmw3ruscptit)
    const cierre = claveDeCierre(j);
    if (s < desde + cierreSeg(j)) return PISTA_VOZ_ES[cierre] == null ? null : { clave: cierre, desde, voz: segDeVoz(cierre) };
    desde += cierreSeg(j);
  }
  return null;
}
// La barra de lo que va, abajo: un clic en ella lleva la animación a ese punto (nota de voz nmw1oc8mctit)
const BARRA = { x: 20, y: 195, ancho: 280, alto: 3 };
// Dónde cae un clic sobre la barra, de 0 a 1, o null si no fue en ella. x e y, en píxeles desde la esquina del lienzo,
// que mide ancho × alto en la página y dibuja sus 320 × 200 centrados (object-fit: contain). Se le da un poco de aire
// alrededor, para no tener que atinarle a una raya de 3 puntos
function puntoDeBarra(x, y, ancho, alto) {
  const e = Math.min(ancho / 320, alto / 200);
  if (!(e > 0)) return null;
  const cx = (x - (ancho - 320 * e) / 2) / e, cy = (y - (alto - 200 * e) / 2) / e;
  if (cy < BARRA.y - 7 || cy > 200 || cx < BARRA.x - 6 || cx > BARRA.x + BARRA.ancho + 6) return null;
  return tope((cx - BARRA.x) / BARRA.ancho);
}
// Un texto largo en renglones que caben en el ancho dado
function renglonesDe(c, texto, ancho) {
  const renglones = [];
  let va = '';
  for (const palabra of String(texto).split(/\s+/).filter(Boolean)) {
    const prueba = va ? `${va} ${palabra}` : palabra;
    if (va && c.measureText(prueba).width > ancho) { renglones.push(va); va = palabra; } else va = prueba;
  }
  if (va) renglones.push(va);
  return renglones;
}
// El tamaño de letra con que un rótulo cabe en su ancho: el que se pide, o menos si la frase es larga
function tamanoQueCabe(c, texto, tam, ancho) {
  c.font = `600 ${tam}px system-ui, sans-serif`;
  const w = c.measureText(texto).width;
  return w > ancho ? Math.max(8, tam * ancho / w) : tam;
}
// El enunciado, al empezar: tú, pensándolo, y el enunciado en renglones, que aparece poco a poco. Los de los guiones
// nuevos son más largos: la letra baja hasta que todos los renglones caben entre tu cubito y la barra
function pintarEnunciado(c, texto, q) {
  actorDev(c, 160, 36 - Math.abs(Math.sin(q * 9)) * 2, 1.5);
  ['?', '?'].forEach((s, k) => letrero(c, s, 182 + k * 9, 26 - k * 6, ORO, 11 + k * 2, 'left'));
  let tam = 14, renglones = [];
  for (; tam >= 10; tam--) {
    c.font = `italic 600 ${tam}px system-ui, sans-serif`;
    renglones = renglonesDe(c, texto, 280);
    if (renglones.length * tam * 1.35 <= 128) break;
  }
  const alto = tam * 1.35, y0 = 120 - ((renglones.length - 1) * alto) / 2;
  renglones.forEach((r, m) => {
    c.save(); c.globalAlpha = tramo(q, m * 0.06, m * 0.06 + 0.2);
    c.font = `italic 600 ${tam}px system-ui, sans-serif`; c.textAlign = 'center'; c.fillStyle = '#fffaf0'; c.fillText(r, 160, y0 + m * alto);
    c.restore();
  });
}
// El cierre de un segmento (nmw3ruscptit): la tarjeta verde con su ✓, que entra con un saltito; adentro, «Resuelto» y el
// problema que quedó resuelto, en corto; a su lado, tu cubito sonriendo, que da un brinco de alegría; y abajo, la frase de
// cierre que dice su voz. Arriba, «✓ Resuelto» y cuál de las situaciones era
function pintarCierre(c, resuelto, frase, q, cual, etiqueta = 'Resuelto') {
  const entra = tramo(q, 0, 0.18), s = 0.86 + 0.14 * entra + Math.sin(tope(q / 0.18) * Math.PI) * 0.05;
  c.save(); c.globalAlpha = entra; c.translate(160, 92); c.scale(s, s); c.translate(-160, -92);
  caja(c, 40, 46, 240, 92, VERDE, 0.16, 14);
  // El ✓, grande, en su círculo
  bola(c, 82, 92, 21, VERDE, 0.18);
  c.save(); c.lineWidth = 1.4; c.strokeStyle = VERDE; c.beginPath(); c.arc(82, 92, 21, 0, 7); c.stroke(); c.restore();
  c.save(); c.translate(82, 92); c.scale(4.2, 4.2); palomita(c, 0, 0, 2.6, tramo(q, 0.08, 0.3)); c.restore();
  letrero(c, etiqueta, 114, 80, '#bff0d2', 9, 'left');
  c.font = '700 14px system-ui, sans-serif';
  const renglones = renglonesDe(c, resuelto, 108);
  renglones.forEach((r, m) => letrero(c, r, 114, 98 + m * 16 - (renglones.length - 1) * 4, '#fffaf0', 14, 'left'));
  c.restore();
  // Tu cubito, sonriendo, que brinca una vez al llegar y después se mece
  const brinco = Math.sin(tramo(q, 0.12, 0.42) * Math.PI) * 9, mece = Math.sin(q * 14) * 1.2;
  actorDev(c, 252, 92 - brinco - mece, 1.9 * (0.8 + 0.2 * entra), true);
  caja(c, 8, 5, 64, 14, VERDE, 0.25, 7);
  letrero(c, `✓ ${etiqueta}`, 40, 15.5, '#dff5e8', 8.5);
  if (cual) { caja(c, 262, 5, 50, 14, VERDE, 0.2, 7); letrero(c, cual, 287, 15.5, '#dff5e8', 8.5); }
  if (frase) letrero(c, frase, 160, 190, '#fffaf0', tamanoQueCabe(c, frase, 11, 300));
}

// ── Las escenas de «Cómo empezar» (pd_como_empezar): con los mismos actores de la estación 1 y de los problemas. Su rótulo,
// abajo, dice lo mismo que su voz (nmw1ga4dftit); el de las frases largas va en dos renglones
function rotuloLargo(c, texto, color = '#fffaf0') {
  c.font = '600 10.5px system-ui, sans-serif';
  const renglones = renglonesDe(c, texto, 300);
  if (renglones.length < 2) return void letrero(c, texto, 160, 190, color, tamanoQueCabe(c, texto, 11, 300));
  renglones.slice(0, 2).forEach((r, m) => letrero(c, r, 160, 177 + m * 12, color, 10.5));
}
// Una carpeta: su pestaña y su cuerpo, con su nombre
function carpeta(c, x, y, w, h, color, nombre) {
  c.save(); c.fillStyle = color; c.globalAlpha *= 0.25;
  c.beginPath(); c.roundRect(x, y - 8, w * 0.4, 12, 4); c.fill(); c.restore();
  caja(c, x, y, w, h, color, 0.2, 7);
  if (nombre) letrero(c, nombre, x + w / 2, y + h + 13, color, 8.5);
}
// Lo que escribes en la ventana de Claude Code, letra a letra, con su «>» (en renglones si no cabe)
function pedidoEscrito(c, x, y, w, texto, k) {
  const va = texto.slice(0, Math.round(texto.length * tope(k)));
  letrero(c, '>', x, y, CIAN, 9, 'left');
  c.font = '600 8.5px system-ui, sans-serif';
  renglonesDe(c, va, w).slice(0, 3).forEach((r, m) => letrero(c, r, x + 9, y + m * 11, '#fffaf0', 8.5, 'left'));
}
const ESCENAS_COMO = [
  // 1 · ¿Quieres probarlo? Tú y el Studio, y el camino entre los dos
  (c, q) => {
    actorDev(c, 80, 108, 1.8, q > 0.6);
    if (q < 0.6) ['?', '?'].forEach((s, k) => letrero(c, s, 100 + k * 9, 82 - k * 6, ORO, 11 + k * 2, 'left'));
    trazo(c, 104, 108, lerp(104, 196, tramo(q, 0.15, 0.6)), 108, ORO, 0.8, true);
    actorStudio(c, 196, 64, 92, 84); letrero(c, 'STL Studio', 242, 58, MORADO, 10);
  },
  // 2 · Tráelo a tu computador: clonarlo o descargarlo de GitHub, los dos caminos a la vista
  (c, q) => {
    ventana(c, 18, 30, 124, 104, 'GitHub', LUZ);
    letrero(c, 'STL-Sacred_Time_Line', 80, 56, '#fffaf0', 8.5);
    const clona = q < 0.5;
    caja(c, 30, 70, 100, 18, CIAN, clona ? 0.35 : 0.1, 6); letrero(c, 'clonar el repositorio', 80, 82.5, '#fffaf0', 8);
    caja(c, 30, 98, 100, 18, ORO, clona ? 0.1 : 0.35, 6); letrero(c, 'descargar el ZIP', 80, 110.5, '#fffaf0', 8);
    // El computador
    caja(c, 196, 46, 104, 66, LUZ, 0.08, 6); caja(c, 236, 112, 24, 8, LUZ, 0.2, 2); caja(c, 222, 120, 52, 5, LUZ, 0.2, 2);
    letrero(c, 'tu computador', 248, 140, LUZ, 9);
    // Lo que viaja: por arriba si lo clonas, por abajo si lo descargas
    const u = clona ? tramo(q, 0.1, 0.42) : tramo(q, 0.58, 0.9), y0 = clona ? 79 : 107;
    trazo(c, 132, y0, 196, 79, clona ? CIAN : ORO, 0.6, true);
    c.save(); c.globalAlpha *= u > 0 && u < 1 ? 1 : 0; caja(c, lerp(134, 236, u), lerp(y0 - 6, 72, u), 14, 12, MORADO, 0.5, 3); c.restore();
    if (q > 0.42) { caja(c, 236, 66, 26, 26, MORADO, 0.35, 5); letrero(c, 'STL', 249, 82, '#fffaf0', 8); }
  },
  // 3 · Ponlo en la carpeta donde quieras trabajar: el Studio cae en su carpeta
  (c, q) => {
    carpeta(c, 104, 92, 112, 60, ORO, 'donde quieras trabajar');
    const cae = tramo(q, 0.1, 0.55);
    caja(c, 140, lerp(24, 104, cae), 40, 34, MORADO, 0.4, 6); letrero(c, 'STL', 160, lerp(24, 104, cae) + 21, '#fffaf0', 9);
    if (q > 0.6) palomita(c, 228, 104, 6, tramo(q, 0.6, 0.7));
    actorDev(c, 50, 120, 1.3, q > 0.6);
  },
  // 4 · El escaneo de seguridad: le pides a Claude Code que lo revise, la lupa pasa por sus archivos y no trae nada malicioso
  (c, q) => {
    ventana(c, 14, 26, 176, 64, VENTANA_COMO, CIAN);
    pedidoEscrito(c, 22, 50, 160, PEDIDOS_COMO[3], tramo(q, 0.04, 0.4));
    actorModelo(c, 48, 132, 9); letrero(c, 'tu modelo', 48, 156, MODELO, 8);
    // Los archivos del Studio, en su carpeta, y la lupa que los recorre
    carpeta(c, 200, 34, 104, 112, ORO, '');
    for (let k = 0; k < 6; k++) {
      renglones(c, 210, 46 + k * 16, 70, 1, 'rgba(255, 255, 255, .4)');
      if (q > 0.5 + k * 0.05) palomita(c, 292, 47.5 + k * 16, 3.2, tramo(q, 0.5 + k * 0.05, 0.54 + k * 0.05));
    }
    if (q > 0.42 && q < 0.86) { const u = tramo(q, 0.44, 0.84); lupa(c, 250, lerp(44, 126, u), 8); trazo(c, 92, 132, 200, 90, CIAN, 0.5, true); }
    if (q > 0.86) letrero(c, 'nada malicioso', 252, 160, VERDE, 10);
  },
  // 5 · Después, pídele que lo instale: «Inicializa STL Studio» y su barra que se llena
  (c, q) => {
    ventana(c, 14, 26, 176, 50, VENTANA_COMO, CIAN);
    pedidoEscrito(c, 22, 52, 160, PEDIDOS_COMO[4], tramo(q, 0.04, 0.3));
    const k = tramo(q, 0.34, 0.82);
    if (q > 0.32) { barra(c, 22, 96, 160, k, VERDE); letrero(c, k < 1 ? 'instalando…' : 'instalado', 102, 124, k < 1 ? '#fffaf0' : VERDE, 9); }
    if (k >= 1) palomita(c, 190, 101, 5);
    actorStudio(c, 214, 46, 90, 76); letrero(c, 'STL Studio', 259, 40, MORADO, 9);
  },
  // 6 · Desde ahí, el Studio te guía paso a paso: tu primera misión, cada paso con su ✓
  (c, q) => {
    actorStudio(c, 20, 40, 104, 96); letrero(c, 'STL Studio', 72, 34, MORADO, 9);
    letrero(c, 'tu primera misión', 222, 40, ORO, 9.5);
    ['Paso 1', 'Paso 2', 'Paso 3'].forEach((paso, m) => {
      const a = 0.12 + m * 0.24;
      if (q > a - 0.1) placaMision(c, 158, 52 + m * 28, 128, paso, q > a + 0.16, tramo(q, a - 0.1, a));
    });
    actorDev(c, 296, 150, 1.1, q > 0.8);
  },
  // 7 · Si te queda alguna duda, la documentación: el README, que se abre con su enlace de abajo
  (c, q) => {
    actorDev(c, 70, 112, 1.6, q > 0.55);
    if (q < 0.55) letrero(c, '?', 92, 86, ORO, 13, 'left');
    ventana(c, 150, 30, 140, 116, 'README · la documentación', ORO);
    renglones(c, 162, 52, 112, 8, 'rgba(255, 241, 196, .45)', tramo(q, 0.1, 0.4), 10);
    if (q > 0.3) lupa(c, lerp(180, 250, tramo(q, 0.3, 0.8)), lerp(64, 110, tramo(q, 0.3, 0.8)), 8);
  },
];
// Una escena de «Cómo empezar» (k, de 0; la última es su cierre), q de 0 a 1 dentro de ella, y p lo que va de toda
function pintarComo(c, k, q, p) {
  const n = GUION_COMO.escenas.length;
  if (k >= n) { pintarCierre(c, 'En marcha', GUION_COMO.cierre, q, '', 'Listo'); pintarBarra(c, p); return; }
  c.save(); c.translate(CONTENIDO.x, CONTENIDO.y); c.scale(CONTENIDO.escala, CONTENIDO.escala);
  ESCENAS_COMO[k](c, q);
  c.restore();
  caja(c, 8, 5, 76, 14, ORO, 0.25, 7); letrero(c, 'Cómo empezar', 46, 15.5, '#fff1c4', 8.5);
  caja(c, 262, 5, 50, 14, ORO, 0.2, 7); letrero(c, `${k + 1} de ${n}`, 287, 15.5, '#fff1c4', 8.5);
  rotuloLargo(c, textoDeComo(k));
  pintarBarra(c, p);
}

// El video corto (video-corto.js) deja cada problema con una sola situación, y entonces el «1 de 1» no va
let sinCuenta = false;
function pintarClip(ctx, i, t) {
  // Una vez, sin repetirse sola: al terminar queda en su último cuadro
  const { n, p, enEnunciado, enProblema, enCierre, k, q, j, texto: paso } = pasoDeClip(i, t);
  const segmento = SEGMENTOS[j];
  ctx.setTransform(4, 0, 0, 4, 0, 0);
  ctx.clearRect(0, 0, 320, 200);
  const fondo = ctx.createRadialGradient(160, 80, 10, 160, 100, 200);
  fondo.addColorStop(0, '#141a2e'); fondo.addColorStop(1, '#07090f');
  ctx.fillStyle = fondo; ctx.fillRect(0, 0, 320, 200);
  if (i === GUIA) return void pintarComo(ctx, k, q, p);
  if (enEnunciado) {
    pintarEnunciado(ctx, paso, q);
    pintarBarra(ctx, p);
    return;
  }
  if (enCierre) {
    pintarCierre(ctx, CIERRES[j]?.[0] ?? '', paso, q, n > 1 || !sinCuenta ? `${k + 1} de ${n}` : '');
    pintarBarra(ctx, p);
    return;
  }
  // Lo de cada situación, un poco más chico y bajo las dos píldoras de arriba («Sin STL» y «1 de 3», que llegan hasta
  // 19), con aire hasta el rótulo de abajo: antes se pegaban al recuadro del contenido (nota de voz nmw1g3dfftit). Lo
  // que se dibujaba de 14 a 180 cae de 22 a 171
  ctx.save(); ctx.translate(CONTENIDO.x, CONTENIDO.y); ctx.scale(CONTENIDO.escala, CONTENIDO.escala);
  if (enProblema) segmento.problema(ctx, q);
  else segmento.solucion(ctx, q, TINTAS[(i + k) % TINTAS.length]);
  ctx.restore();
  caja(ctx, 8, 5, 52, 14, enProblema ? ROJO : VERDE, 0.25, 7);
  letrero(ctx, enProblema ? 'Sin STL' : 'Con STL', 34, 15.5, enProblema ? '#ffc2cf' : '#dff5e8', 8.5);
  // Cuál de las situaciones se ve: «1 de 3» (en el video, con una sola, no va)
  if (n > 1 || !sinCuenta) {
    caja(ctx, 262, 5, 50, 14, enProblema ? ROJO : VERDE, 0.2, 7);
    letrero(ctx, `${k + 1} de ${n}`, 287, 15.5, enProblema ? '#ffc2cf' : '#dff5e8', 8.5);
  }
  if (paso) letrero(ctx, paso, 160, 190, enProblema ? '#ffc2cf' : '#fffaf0', tamanoQueCabe(ctx, paso, 11, 300));
  pintarBarra(ctx, p);
}
// La barra de lo que va: se llena hasta el final y ahí se queda; con su punta, para ver dónde va y dónde dar clic
function pintarBarra(ctx, p) {
  ctx.fillStyle = 'rgba(255, 255, 255, .12)'; ctx.fillRect(BARRA.x, BARRA.y, BARRA.ancho, BARRA.alto);
  ctx.fillStyle = ORO; ctx.fillRect(BARRA.x, BARRA.y, BARRA.ancho * p, BARRA.alto);
  bola(ctx, BARRA.x + BARRA.ancho * p, BARRA.y + BARRA.alto / 2, 2.6, ORO);
}

// ── Dónde va cada cosa de la estación 2 en la pantalla (nota de voz nmw40cp3jtit): el anillo de íconos, pegado al menú de
// la derecha, y el reproductor del problema abierto, en todo lo que queda a su izquierda, hasta donde deja la pantalla (sin
// tapar los íconos, el menú ni la línea de abajo), con su animación de 16 × 10 y sus mandos adentro, debajo. v: el ancho y el
// alto de la pantalla, dónde empieza el menú (menuIzq), dónde empieza la línea de abajo (lineaArriba), la mitad del ancho y
// del alto del anillo abierto, con el aire de sus íconos (anilloMedio, anilloAlto), y el alto de los mandos (mandos). Pura
const ASPECTO_CLIP = 16 / 10;
function disponerReproductor(v) {
  const margen = Math.max(16, v.ancho * 0.015), aire = 24;
  const arriba = Math.max(16, v.alto * 0.04), abajo = v.lineaArriba - 16;
  const anilloX = v.menuIzq - aire - v.anilloMedio;
  const anilloY = Math.max(arriba + v.anilloAlto, (arriba + abajo) / 2);
  const izq = margen, der = anilloX - v.anilloMedio - aire;
  let w = Math.max(0, der - izq), h = w / ASPECTO_CLIP + v.mandos;
  if (h > abajo - arriba) { h = Math.max(0, abajo - arriba); w = Math.max(0, (h - v.mandos) * ASPECTO_CLIP); }
  return { x: izq + (der - izq - w) / 2, y: arriba + (abajo - arriba - h) / 2, w, h, anilloX, anilloY };
}
// ¿Se tocan dos rectángulos ({ x, y, w, h })? Cuánto, en área (0, nada)
const cruce = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
// Dónde va el globo de un ícono, de w × h: primero hacia afuera del anillo, y si ahí pisa algo (otro ícono, el reproductor,
// el menú, la línea de abajo) o se sale de la pantalla, al otro lado, arriba o abajo; si todos pisan, el que menos.
// icono: { x, y, r } en la pantalla; centro: el del anillo; obstaculos: rectángulos; lim: { ancho, alto }. Pura
function lugarDelGlobo(icono, w, h, centro, obstaculos, lim, sep = 10) {
  const d = icono.r + sep, afuera = icono.x >= centro.x ? 1 : -1;
  const lados = [
    { x: icono.x + afuera * d - (afuera < 0 ? w : 0), y: icono.y - h / 2 },
    { x: icono.x - afuera * d - (afuera > 0 ? w : 0), y: icono.y - h / 2 },
    { x: icono.x - w / 2, y: icono.y - d - h },
    { x: icono.x - w / 2, y: icono.y + d },
  ].map((r) => ({ ...r, w, h }));
  const fuera = (r) => (r.x < 8 || r.y < 8 || r.x + r.w > lim.ancho - 8 || r.y + r.h > lim.alto - 8 ? 1e9 : 0);
  const costo = (r) => fuera(r) + obstaculos.reduce((s, o) => s + cruce(r, o), 0);
  return lados.reduce((mejor, r) => (costo(r) < costo(mejor) ? r : mejor), lados[0]);
}
// La pantalla de un problema se cierra sola CIERRA_TRAS_SEG segundos después de que su animación termina (nota de voz del 5
// de noviembre). Si la persona oprime «↻ Repetir» (o vuelve a ver la animación) antes, la pantalla se queda abierta y ya no
// se cierra sola. El reloj no mide nada por su cuenta: en cada cuadro se le dice la hora y si la animación ya terminó
const CIERRA_TRAS_SEG = 4;
function relojAutocierre(espera = CIERRA_TRAS_SEG) {
  let finEn = null, manual = false;
  return {
    /** Un cuadro: true cuando ya toca cerrar. ahora, en milisegundos; terminada, si la animación llegó a su fin. */
    cuadro(ahora, terminada) {
      if (manual || !terminada) { finEn = null; return false; }
      if (finEn === null) finEn = ahora;
      return ahora - finEn >= espera * 1000;
    },
    /** La persona repitió la animación: ya no se cierra sola. */
    repetir() { manual = true; finEn = null; },
    /** Una pantalla nueva: vuelve a cerrarse sola. */
    abrir() { manual = false; finEn = null; },
    get sola() { return !manual; },
  };
}

function iniciar() {
  const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: !movil, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, movil ? 1.25 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const escena = new THREE.Scene();
  // El cielo y la niebla del mismo color: así no se ve dónde termina el suelo
  escena.background = new THREE.Color('#0a0d18');
  escena.fog = new THREE.FogExp2('#0a0d18', 0.016);
  const camara = new THREE.PerspectiveCamera(55, 1, 0.1, 600);

  escena.add(new THREE.HemisphereLight(MORADO, NOCHE, 0.7));
  const sol = new THREE.DirectionalLight('#ffe7b8', 1.1);
  sol.position.set(30, 60, 20);
  escena.add(sol);
  const farol = new THREE.PointLight(ORO, 40, 26, 1.6);   // va con la cámara: ilumina lo que tiene cerca
  escena.add(farol);

  // ── El suelo (sin estrellas ni adornos: solo la línea, su halo y la rejilla)
  const suelo = new THREE.Mesh(new THREE.PlaneGeometry(500, 700), new THREE.MeshStandardMaterial({ color: '#0a0e1a', roughness: 1 }));
  suelo.rotation.x = -Math.PI / 2;
  suelo.position.set(0, -3, -220);
  escena.add(suelo);
  const rejilla = new THREE.GridHelper(700, 140, '#1c2540', '#121a30');
  rejilla.position.set(0, -2.98, -220);
  escena.add(rejilla);

  // ── La línea del tiempo: un camino de luz que serpentea hacia adelante. Sigue más allá de la estación 2, hacia las
  // estaciones del tramo siguiente, y se pierde en la niebla
  const puntos = [];
  for (let i = 0; i <= 13; i++) puntos.push(new THREE.Vector3(Math.sin(i * 0.7) * 7 + (i % 3 - 1) * 1.5, 0.6 + Math.sin(i * 0.45) * 1.1, -i * 28));
  const camino = new THREE.CatmullRomCurve3(puntos, false, 'centripetal');
  escena.add(new THREE.Mesh(new THREE.TubeGeometry(camino, 1400, 0.11, 10, false), new THREE.MeshBasicMaterial({ color: LINEA })));
  const halo = new THREE.MeshBasicMaterial({ color: LINEA, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false });
  escena.add(new THREE.Mesh(new THREE.TubeGeometry(camino, 700, 0.34, 10, false), halo));

  const ARRIBA = new THREE.Vector3(0, 1, 0);
  const marco = (u) => {   // dónde está la línea en u, hacia dónde va y cuál es su costado
    const p = camino.getPointAt(u), t = camino.getTangentAt(u);
    const lado = new THREE.Vector3(-t.z, 0, t.x).normalize();
    return { p, t, lado };
  };
  const PARADA = [0.1, 0.42, 0.7];   // dónde se detiene la cámara en cada estación (de 0 a 1)
  // Dónde está lo que se ve en cada estación: un poco más adelante, para que la cámara lo vea de frente y no encima
  const SITIO = PARADA.map((u) => u + 0.022);
  const focos = [];   // lo que mira la cámara en cada estación
  const animar = [];  // lo que se mueve: funciones (t) => void
  // El reloj de cada estación: ninguna se anima hasta que se oprime «Empieza el recorrido», y un clic en una estación del
  // menú vuelve a empezar la suya, para repetirla cuando se quiera (nota de voz nmw1khrketit). null: aún no empieza
  const relojes = [null, null, null];
  const empezarEstacion = (k) => { if (k >= 0 && k < relojes.length) relojes[k] = performance.now() / 1000; };
  // El video empieza el ciclo de la estación 1 en el segundo que pide, para que se vea al director hablar con el modelo
  ganchoVideo.estacion1 = (seg) => { relojes[0] = performance.now() / 1000 - seg; };
  const tiempoDe = (k) => relojes[k] === null ? 0 : performance.now() / 1000 - relojes[k];
  // Lo que se mueve en una estación corre con su propio reloj, no con el de la página
  const deEstacion = (k, f) => () => f(compartir ? MOMENTO_COMPARTIR : tiempoDe(k));
  const azar = (a, b) => a + Math.random() * (b - a);

  // Un rótulo flotante: texto sobre una píldora, siempre de frente a la cámara
  function rotulo(texto, color = LUZ, alto = 0.6) {
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    const f = 46;
    ctx.font = `600 ${f}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
    const w = Math.ceil(ctx.measureText(texto).width) + 56;
    c.width = w; c.height = 84;
    ctx.font = `600 ${f}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
    ctx.fillStyle = 'rgba(8, 11, 20, 0.82)';
    ctx.strokeStyle = color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(2, 2, w - 4, 80, 40); ctx.fill(); ctx.globalAlpha = 0.55; ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = color; ctx.textBaseline = 'middle'; ctx.fillText(texto, 28, 44);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false }));
    s.scale.set(alto * w / 84, alto, 1);
    s.visible = !compartir;
    return s;
  }
  // La carita de un cubo (ojos, mejillas y sonrisa, como la de la animación de la línea): una textura sin fondo, para
  // ponerla en un plano pegado a su cara
  function carita(tinta = '#1a1f33') {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const x = c.getContext('2d');
    x.fillStyle = tinta; x.strokeStyle = tinta; x.lineCap = 'round';
    for (const ox of [-58, 58]) { x.beginPath(); x.ellipse(128 + ox, 106, 15, 22, 0, 0, 7); x.fill(); }
    x.fillStyle = 'rgba(255, 140, 150, .6)';
    for (const ox of [-86, 86]) { x.beginPath(); x.arc(128 + ox, 150, 15, 0, 7); x.fill(); }
    x.lineWidth = 11; x.beginPath(); x.moveTo(88, 158); x.quadraticCurveTo(128, 202, 168, 158); x.stroke();
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
  const brillo = (color, intensidad = 0.7) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensidad, roughness: 0.45, metalness: 0.15 });
  const plano = (color, opacidad = 1) => new THREE.MeshBasicMaterial({ color, transparent: opacidad < 1, opacity: opacidad, depthWrite: opacidad >= 1 });
  // Una luz como la que llevan el desarrollador y el modelo en la animación de la línea (linea-del-proyecto.html ›
  // desarrollador y modelo: un halo tibio que se desvanece a su alrededor): un resplandor detrás del cubo, siempre de
  // frente a la cámara, y una luz de su color que lo ilumina de cerca (nota de voz nmw1o0ca0tit). rgb, como «255, 241, 196»
  function resplandor(rgb, color, tam) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, `rgba(${rgb}, .55)`); g.addColorStop(0.4, `rgba(${rgb}, .2)`); g.addColorStop(1, `rgba(${rgb}, 0)`);
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    halo.scale.set(tam, tam, 1);
    const foco = new THREE.PointLight(color, 7, tam * 1.6, 1.6);
    return { halo, foco };
  }
  // La cara del director, la misma del Studio (estudio/src/cara.ts): un visor oscuro con sus ojos y su sonrisa de luz cian
  function visorDirector() {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const x = c.getContext('2d');
    x.fillStyle = '#2b2826'; x.beginPath(); x.roundRect(26, 48, 204, 150, 62); x.fill();
    x.strokeStyle = '#a8f4fb'; x.lineWidth = 14; x.lineCap = 'round';
    for (const ox of [-44, 44]) { x.beginPath(); x.arc(128 + ox, 118, 17, Math.PI, 0); x.stroke(); }
    x.beginPath(); x.moveTo(98, 152); x.quadraticCurveTo(128, 180, 158, 152); x.stroke();
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
  // Un cubo redondeado con su carita en la cara que mira hacia dónde se le diga (dirección en el plano del suelo)
  function cuboConCara(lado, color, emisivo, mirada, tinta, textura = carita(tinta)) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new RoundedBoxGeometry(lado, lado, lado, 4, lado * 0.16), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: emisivo, roughness: 0.5 })));
    const cara = new THREE.Mesh(new THREE.PlaneGeometry(lado * 0.92, lado * 0.92), new THREE.MeshBasicMaterial({ map: textura, transparent: true, depthWrite: false }));
    cara.position.z = lado / 2 + 0.012;
    g.add(cara);
    g.lookAt(g.position.clone().add(mirada));   // la cara (+z) mira hacia mirada
    return g;
  }

  // La vista de la estación 1 (y de la entrada, desde más lejos): de costado, con la línea cruzando la pantalla de
  // izquierda a derecha. La arma la estación 1
  let portada = null;
  const orbes = [];   // los seis grandes problemas de la estación 2

  // ── Estación 1, qué es STL: tres actores (nota de voz nmw1c3q68tit): el desarrollador (un cubo amarillo con su sonrisa)
  // en la línea del tiempo, a la izquierda; el Studio (una caja translúcida) y el modelo, EN ALTO, muy por encima de la
  // línea, porque no son parte de ella sino con lo que el desarrollador interactúa mientras avanza; y el director, DENTRO
  // del Studio (un cubo blanco más chico con el visor de su cara): la herramienta del Studio que ordena los pedidos y habla
  // con el modelo. El ciclo se repite: el desarrollador le sube sus pedidos al Studio, el director los ordena y habla con
  // el modelo, vuelven ordenados y el Studio devuelve tres misiones que caen a la línea, repartidas a lo largo de ella.
  // Entonces el desarrollador avanza por la línea del tiempo: las misiones se mueven hacia la izquierda, cada una se pone
  // verde con su ✓ al encontrarse con él, y siguen hasta apagarse en el horizonte, detrás; él queda listo y todo empieza
  // otra vez (nmw17k73utit, nmw197t4jtit, nmw1c3q68tit). Cada tipo de pedido tiene su propia figura 3D, no solo su color.
  // Todo se mide sobre la línea (enLinea), desde el sitio de la estación: negativo es atrás, positivo adelante
  {
    const u = SITIO[0];
    const { t, lado } = marco(u);
    const largo = camino.getLength();
    const enLinea = (d, v = new THREE.Vector3()) => v.copy(camino.getPointAt(tope(u + d / largo)));
    const deFrente = lado.clone().multiplyScalar(0.87);
    // Dónde está cada uno sobre la línea, y cuánto por encima de ella van el Studio y el modelo (antes, a 1,9 y 2,4)
    const D_TU = -13, D_MODELO = 14;
    // El Studio, más grande (nota de voz nmw1g3dfftit): un poco más alto, para que su cara de abajo no toque las misiones
    const ALTO_STUDIO = 8, ALTO_MODELO = 8;

    // El desarrollador: el cubo amarillo del cuadro de la línea, parado en ella, a la izquierda. Su carita mira a la
    // cámara, un poco hacia el Studio. Los rótulos son más grandes que antes (eran de 0,5 a 0,55; nmw1c3q68tit)
    const pTu = enLinea(D_TU).addScaledVector(ARRIBA, 1.0);
    const tu = cuboConCara(1.7, AMARILLO_TU, 0.28, deFrente.clone().addScaledVector(t, 0.5));
    tu.position.copy(pTu);
    const rTu = rotulo(T.dev, '#fff1c4', 1.0);
    rTu.position.copy(pTu).addScaledVector(ARRIBA, 1.9);
    escena.add(tu, rTu);
    // Su luz tibia, como en la animación de la línea (nmw1o0ca0tit)
    const luzTu = resplandor('255, 241, 196', '#fff1c4', 1.7 * 2.6);
    luzTu.halo.position.copy(pTu);
    luzTu.foco.position.copy(pTu).addScaledVector(deFrente, 1.6);
    escena.add(luzTu.halo, luzTu.foco);

    // El Studio, en alto: una caja (un cuadrado, no un anillo) translúcida con su marco
    // El doble que antes (4,6), para que el director y lo que procesa dentro se aprecien mejor (nota de voz nmw1g3dfftit)
    const LADO_S = 9.2;
    const centro = enLinea(0).addScaledVector(ARRIBA, ALTO_STUDIO);
    const studio = new THREE.Group();
    studio.add(new THREE.Mesh(new THREE.BoxGeometry(LADO_S, LADO_S, LADO_S), new THREE.MeshBasicMaterial({ color: MORADO, transparent: true, opacity: 0.1, depthWrite: false })));
    studio.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(LADO_S, LADO_S, LADO_S)), new THREE.LineBasicMaterial({ color: MORADO })));
    studio.position.copy(centro);
    studio.lookAt(centro.clone().add(t));
    const ROTULO_SOBRE_STUDIO = 2.3;
    const rStudio = rotulo(T.estudio, MORADO, 1.0);
    // Sin tocar el cubo (nota de voz nmw27yt10tit): la cámara mira desde más abajo, así que la arista de arriba más cercana
    // se ve más alta que la cara de arriba; a 0,9 sobre ella, la línea le pisaba el rótulo. A 2,3, queda despejado
    rStudio.position.copy(centro).addScaledVector(ARRIBA, LADO_S / 2 + ROTULO_SOBRE_STUDIO);
    escena.add(studio, rStudio);

    // El director, dentro del Studio: el mismo cubo blanco con el visor de su cara, más chico. Es la herramienta del Studio
    // que ordena los pedidos y habla con el modelo
    // Bien centrado en el cubo (nmw1g3dfftit); un 10 % más grande que en la vuelta anterior (1,2; nota de voz nmw1kggjmtit)
    const pDir = centro.clone();
    const director = cuboConCara(1.32, '#f4f1ea', 0.12, deFrente.clone().addScaledVector(t, -0.3), undefined, visorDirector());
    director.position.copy(pDir);
    const rDir = rotulo(T.director, ORO, 0.7);
    rDir.position.copy(pDir).addScaledVector(ARRIBA, 1.15);
    escena.add(director, rDir);

    // El modelo, también en alto, a la derecha
    const pModelo = enLinea(D_MODELO).addScaledVector(ARRIBA, ALTO_MODELO);
    // Un 30 % más chico que antes (3; nmw1g3dfftit)
    const modelo = cuboConCara(2.1, MODELO, 0.16, lado.clone().multiplyScalar(0.87).addScaledVector(t, -0.5), '#1a1f33');
    modelo.position.copy(pModelo);
    const matModelo = modelo.children[0].material;
    const rModelo = rotulo(T.modelo, MODELO, 1.0);
    rModelo.position.copy(pModelo).addScaledVector(ARRIBA, 1.9);
    escena.add(modelo, rModelo);
    // Y la suya, azulada, como su brillo en la animación de la línea (nmw1o0ca0tit)
    const luzModelo = resplandor('197, 210, 230', MODELO, 2.1 * 2.6);
    luzModelo.halo.position.copy(pModelo);
    luzModelo.foco.position.copy(pModelo).addScaledVector(lado, 1.8);
    escena.add(luzModelo.halo, luzModelo.foco);

    // Lo que el director le dice al modelo: un hilo entre los dos y tres pulsos que van y vuelven, solo mientras hablan;
    // después desaparece (nota de voz nmw1g3dfftit)
    const hilo = plano(CIAN, 0.32);
    const hiloMalla = new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(pDir, pModelo), 8, 0.04, 6, false), hilo);
    hiloMalla.visible = false;
    escena.add(hiloMalla);
    const pulsos = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), plano(CIAN)); escena.add(m); return m; });

    // Las figuras de cada tipo de pedido, de frente a la cámara: una falla es un rayo; una idea, una bombilla (esfera y
    // base); un ajuste, un engranaje con dientes; una pregunta (petición), un sobre; una respuesta (comentario), un globo
    // de diálogo. Todas miden unos 0,6 y llevan el color de su tipo
    const extruida = (forma, prof, bisel = 0.02) => {
      const g = new THREE.ExtrudeGeometry(forma, { depth: prof, bevelEnabled: true, bevelThickness: bisel, bevelSize: bisel, bevelSegments: 1, curveSegments: 8 });
      g.center();
      return g;
    };
    const hacerFigura = {
      falla: (mat) => {
        const s = new THREE.Shape();
        s.moveTo(0.12, 0.34); s.lineTo(-0.2, -0.02); s.lineTo(-0.02, -0.02); s.lineTo(-0.12, -0.36); s.lineTo(0.2, 0.06); s.lineTo(0.02, 0.06); s.closePath();
        return new THREE.Mesh(extruida(s, 0.12), mat);
      },
      idea: (mat) => {
        const g = new THREE.Group();
        const bulbo = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), mat); bulbo.position.y = 0.1;
        const base = new THREE.Mesh(new RoundedBoxGeometry(0.15, 0.1, 0.15, 2, 0.03), mat); base.position.y = -0.14;
        const punta = new THREE.Mesh(new RoundedBoxGeometry(0.09, 0.05, 0.09, 2, 0.02), mat); punta.position.y = -0.22;
        g.add(bulbo, base, punta);
        return g;
      },
      ajuste: (mat) => {
        const s = new THREE.Shape(), dientes = 8;
        for (let k = 0; k < dientes * 4; k++) {   // cada diente: dos puntos adentro y dos afuera
          const a = (k / (dientes * 4)) * Math.PI * 2, r = k % 4 === 1 || k % 4 === 2 ? 0.3 : 0.22;
          if (k === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r); else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        s.closePath();
        const hueco = new THREE.Path();
        hueco.absarc(0, 0, 0.08, 0, Math.PI * 2, true);
        s.holes.push(hueco);
        return new THREE.Mesh(extruida(s, 0.1), mat);
      },
      pregunta: (mat) => {
        const g = new THREE.Group();
        g.add(new THREE.Mesh(new RoundedBoxGeometry(0.52, 0.36, 0.08, 2, 0.03), mat));
        const tapa = new THREE.Shape();
        tapa.moveTo(-0.26, 0.18); tapa.lineTo(0.26, 0.18); tapa.lineTo(0, -0.04); tapa.closePath();
        const solapa = new THREE.Mesh(extruida(tapa, 0.03, 0.01), brillo(LUZ, 0.5));
        solapa.position.set(0, 0.075, 0.06);
        g.add(solapa);
        return g;
      },
      respuesta: (mat) => {
        const s = new THREE.Shape(), x0 = -0.28, x1 = 0.28, y0 = -0.14, y1 = 0.2, r = 0.09;
        s.moveTo(x0 + r, y0); s.lineTo(-0.12, y0); s.lineTo(-0.2, -0.3); s.lineTo(0, y0);   // y su colita
        s.lineTo(x1 - r, y0); s.quadraticCurveTo(x1, y0, x1, y0 + r);
        s.lineTo(x1, y1 - r); s.quadraticCurveTo(x1, y1, x1 - r, y1);
        s.lineTo(x0 + r, y1); s.quadraticCurveTo(x0, y1, x0, y1 - r);
        s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0);
        return new THREE.Mesh(extruida(s, 0.1), mat);
      },
    };
    const giro = Math.atan2(lado.x, lado.z);   // para que la figura mire hacia la cámara

    // Lo que le entregas: diez figuras, cada una del tipo y del color de una nota, en desorden. Vuelven ordenadas por tipo
    const TIPOS_ENTREGA = ['idea', 'ajuste', 'falla', 'pregunta', 'idea', 'respuesta', 'ajuste', 'falla', 'pregunta', 'idea'];
    const N_ENTREGA = TIPOS_ENTREGA.length;
    const ORDEN_TIPOS = Object.keys(COLOR_TIPO);
    const rango = TIPOS_ENTREGA.map((tipo, k) => k).sort((a, b) => ORDEN_TIPOS.indexOf(TIPOS_ENTREGA[a]) - ORDEN_TIPOS.indexOf(TIPOS_ENTREGA[b]) || a - b);
    const puesto = Array(N_ENTREGA);   // su lugar en las filas, ya ordenado por tipo
    rango.forEach((k, r) => { puesto[k] = r; });
    // Salen de arriba del desarrollador
    const salida = pTu.clone().addScaledVector(t, 0.9).addScaledVector(ARRIBA, 1.1);

    // Lo que el Studio te devuelve: tres misiones, «Misión 1», «Misión 2» y «Misión 3», que caen a la línea repartidas a lo
    // ancho de ella (ya no hay actores parados en la línea), una placa dorada con su nombre. Después avanzan hacia la
    // izquierda, hacia el desarrollador: se ponen verdes con su ✓ al encontrarse con él y se apagan detrás
    const D_MISION = [3, 10, 17];
    const D_FIN = -27;   // hasta dónde llega la última, ya apagada
    const RECORRIDO = D_MISION[2] - D_FIN;
    const SALEN = 0.7, LLEGAN = 0.96;   // el avance de las misiones, dentro del ciclo
    const verde = new THREE.Color(VERDE), oro = new THREE.Color(ORO);
    const MISIONES = D_MISION.map((d, j) => {
      const pos = enLinea(d).addScaledVector(ARRIBA, 0.3);
      const mat = brillo(ORO, 0.55);
      mat.transparent = true;
      const placa = new THREE.Mesh(new RoundedBoxGeometry(1.7, 0.3, 1.2, 3, 0.09), mat);
      placa.position.copy(pos);
      const nombre = rotulo(`${T.mision} ${j + 1}`, ORO, 0.8), hecha = rotulo(`${T.mision} ${j + 1} ✓`, VERDE, 0.8);
      escena.add(placa, nombre, hecha);
      return { d, pos, mat, placa, nombre, hecha };
    });
    const anillo = (k) => k * (Math.PI * 2 / N_ENTREGA) + 0.3;   // el lugar de cada figura en el anillo, alrededor del director
    const entregas = TIPOS_ENTREGA.map((tipo, k) => {
      const m = new THREE.Group();
      const figura = hacerFigura[tipo](brillo(COLOR_TIPO[tipo], 0.8));
      figura.rotation.y = giro;
      m.add(figura);
      escena.add(m);
      const r = puesto[k];
      return {
        m,
        // En el Studio, como llegan: revueltos y flotando ALREDEDOR del director, en un anillo de frente a la cámara, sin
        // taparlo (antes quedaban delante de él; nota de voz nmw1kggjmtit)
        revuelto: pDir.clone().addScaledVector(t, Math.cos(anillo(k)) * (2.9 + ((k * 7) % 3) * 0.35)).addScaledVector(ARRIBA, Math.sin(anillo(k)) * (2.6 + ((k * 5) % 3) * 0.3)).addScaledVector(lado, ((k * 3) % 3) * 0.3),
        // De vuelta en el Studio, en dos filas por tipo, abajo y delante del director; con aire entre una y otra, para que
        // sus rótulos no se pisen (nmw1o0ca0tit)
        ordenado: centro.clone().addScaledVector(t, ((r % 5) - 2) * 1.9).addScaledVector(ARRIBA, -2.0 - Math.floor(r / 5) * 1.15).addScaledVector(lado, 2.2),
        // Y de ahí a la misión que forman, ya ordenados: los primeros, la misión 1
        mision: MISIONES[Math.min(2, Math.floor((r * 3) / N_ENTREGA))].pos,
      };
    });
    // Un rótulo en CADA figura, con su tipo: «Error», «Idea», «Ajuste», «Petición» o «Comentario» (antes, solo la primera
    // de cada tipo; nota de voz nmw1o0ca0tit). En el anillo no se pisan (tools/recorrido3d.test.ts lo mide)
    const ALTO_ETIQUETA = 0.55, SOBRE_FIGURA = 0.6;
    const etiquetasTipo = TIPOS_ENTREGA.map((tipo, k) => {
      const r = rotulo(T[tipo], COLOR_TIPO[tipo], ALTO_ETIQUETA);
      escena.add(r);
      return { r, k };
    });
    const orbita = (k, tt, v) => {
      const a = tt * 1.1 + k * (Math.PI * 2 / N_ENTREGA);
      return v.copy(pDir).addScaledVector(t, Math.cos(a) * 2.4).addScaledVector(lado, Math.sin(a) * 2.4).addScaledVector(ARRIBA, Math.sin(a * 2 + k) * 0.5);
    };
    // Mientras esperan a que el director empiece a procesarlas, flotan en su lugar del anillo, sin girar a su alrededor
    const flota = (e, k, tt, v) => v.copy(e.revuelto).addScaledVector(ARRIBA, Math.sin(tt * 1.6 + k * 1.7) * 0.18);
    // Cuándo empieza el director a procesar cada figura: desde ahí gira alrededor de él y pierde su rótulo (nmw1kggjmtit)
    const procesa = (k) => 0.20 + 0.004 * k;
    // Con su rótulo, salvo mientras gira alrededor del director (de procesa(k) a cuando vuelve, ordenada) y en el último
    // tramo de su caída, cuando ya se junta con las otras en su misión
    const conEtiqueta = (k, c) => c < procesa(k) || (c >= 0.48 + 0.004 * k && c < 0.625 + 0.004 * k);
    // El ciclo, de 0 a 1; cada figura sale un poco después de la anterior. Vuelve a su velocidad normal (36 s): la mitad
    // de velocidad era para las animaciones de los problemas, no para esta (nmw1kggjmtit). Y el director habla con el
    // modelo dos segundos menos (de HABLA_DE a HABLA_A del ciclo, 7,2 s que pasan a 5,2; nota de voz nmw1o0ca0tit): el
    // ciclo dura 34 s, y lo demás va igual que antes. Y otros dos segundos menos (nota de voz nmw27y0antit): habla 3,2 s y
    // el ciclo dura 32. Y un segundo menos todavía (nota de voz nmw2cpbentit): habla 2,2 s y el ciclo dura 31
    const CICLO_BASE = 36, MENOS_HABLA = 5, HABLA_DE = 0.28, HABLA_A = 0.48;
    const CICLO_ENTREGA = CICLO_BASE - MENOS_HABLA;
    const cicloDe = (tt) => {
      const s = tt % CICLO_ENTREGA, de = HABLA_DE * CICLO_BASE, a = HABLA_A * CICLO_BASE - MENOS_HABLA;
      const base = s < de ? s : s < a ? de + ((s - de) * (a + MENOS_HABLA - de)) / (a - de) : s + MENOS_HABLA;
      return base / CICLO_BASE;
    };
    const va = new THREE.Vector3(), viene = new THREE.Vector3();
    function mover(e, k, c, tt) {
      const tramos = [   // [empieza, termina, de dónde, a dónde, cuánto salta]
        [0.02 + 0.01 * k, 0.09 + 0.01 * k, () => salida, (v) => flota(e, k, tt, v), 2.2],      // tú → el Studio, en alto
        [procesa(k), procesa(k) + 0.06, (v) => flota(e, k, tt, v), (v) => orbita(k, tt, v), 0.5],   // el Studio → el director, dentro de él
        [0.48 + 0.004 * k, 0.54 + 0.004 * k, (v) => orbita(k, tt, v), () => e.ordenado, 0.5],   // el director → el Studio, ordenados
        [0.58 + 0.004 * k, 0.64 + 0.004 * k, () => e.ordenado, () => e.mision, 1.0],   // el Studio → la línea, en misiones
      ];
      let donde = () => salida;   // dónde espera entre un tramo y el siguiente
      for (const [a, b, de, hasta, salto] of tramos) {
        if (c < a) return e.m.position.copy(donde(va));
        if (c < b) {
          const s = suave((c - a) / (b - a));
          e.m.position.copy(de(va)).lerp(hasta(viene), s);
          e.m.position.y += Math.sin(s * Math.PI) * salto;
          return e.m.position;
        }
        donde = hasta;
      }
      return e.m.position.copy(donde(va));
    }
    animar.push(deEstacion(0, (tt) => {
      const c = cicloDe(tt);
      entregas.forEach((e, k) => {
        mover(e, k, c, tt);
        // Nace al salir del desarrollador y se apaga al llegar a su misión, que lo recoge
        e.m.scale.setScalar(tope((c - 0.02 - 0.01 * k) / 0.02) * (1 - tope((c - 0.64 - 0.004 * k) / 0.03)));
        e.m.rotation.y = c > 0.54 ? 0 : tt * 0.8;
      });
      // Los rótulos de los tipos, todo el tiempo: mientras viajan hacia el Studio y flotan alrededor del director, cuando
      // vuelven ordenados y mientras caen a la línea; solo se esconden mientras giran alrededor del director (desde que él
      // empieza a procesar su figura hasta que la suelta) y justo antes de juntarse en su misión, que trae el suyo
      // (nmw1kggjmtit, nmw1o0ca0tit)
      etiquetasTipo.forEach(({ r, k }) => {
        const m = entregas[k].m;
        r.visible = conEtiqueta(k, c) && m.scale.x > 0.6;
        r.position.copy(m.position).addScaledVector(ARRIBA, SOBRE_FIGURA);
      });
      // Las misiones: caen del Studio a la línea, avanzan hacia la izquierda, se ponen verdes al encontrarse con el
      // desarrollador y se apagan en el horizonte, detrás de él, antes del ciclo siguiente
      const avance = tope((c - SALEN) / (LLEGAN - SALEN)) * RECORRIDO;
      let encuentro = 0;
      MISIONES.forEach((m) => {
        const d = m.d - avance;
        enLinea(d, m.pos).addScaledVector(ARRIBA, 0.3);
        const ve = tope((c - 0.62) / 0.04) * (1 - tope((c - 0.97) / 0.03));
        const alfa = 1 - tope((D_TU - 2 - d) / 9);
        const hecha = d <= D_TU + 0.6;
        m.placa.position.copy(m.pos);
        m.placa.scale.setScalar(Math.max(ve, 0.001));
        m.mat.opacity = alfa;
        m.mat.color.copy(hecha ? verde : oro); m.mat.emissive.copy(hecha ? verde : oro);
        m.nombre.material.opacity = m.hecha.material.opacity = alfa;
        m.nombre.visible = ve * alfa > 0.02 && !hecha;
        m.hecha.visible = ve * alfa > 0.02 && hecha;
        m.nombre.position.copy(m.pos).addScaledVector(ARRIBA, 1.05);
        m.hecha.position.copy(m.nombre.position);
        encuentro = Math.max(encuentro, tope(1 - Math.abs(d - D_TU) / 1.5) * ve);
      });
      // El desarrollador se alegra cada vez que una misión lo alcanza
      tu.position.copy(pTu).addScaledVector(ARRIBA, suave(encuentro) * 0.5 + Math.abs(Math.sin(tt * 2)) * 0.04);
      rTu.position.copy(tu.position).addScaledVector(ARRIBA, 1.9);
      luzTu.halo.position.copy(tu.position);
      // Mientras giran alrededor del director, él habla con el modelo
      const hablan = c > 0.28 && c < 0.48;
      pulsos.forEach((m, j) => {
        const f = (tt * 0.7 + j / 3) % 1, ida = f < 0.5 ? f * 2 : 2 - f * 2;
        m.position.copy(pDir).lerp(pModelo, ida);
        m.scale.setScalar(hablan ? 1 : 0.001);
      });
      hiloMalla.visible = hablan;
      matModelo.emissiveIntensity = hablan ? 0.2 + 0.25 * Math.sin(tt * 5) ** 2 : 0.16;
      luzModelo.halo.material.opacity = hablan ? 0.85 + 0.15 * Math.sin(tt * 5) ** 2 : 0.85;
      director.position.y = pDir.y + (hablan ? Math.abs(Math.sin(tt * 3)) * 0.12 : 0);
    }));

    // La vista: de costado, desde el lado de la cámara, con todo a la vista (el Studio y el modelo en alto, el
    // desarrollador, la línea y las misiones hasta que se apagan) y su centro al centro de la pantalla; más lejos que
    // antes, porque ahora hay más alto y más ancho. Centrada en el Studio y no 5 antes: así el modelo no queda bajo el
    // menú de la derecha (se veía en la captura con WebGL por software, a 1440 × 900), y las misiones que pasan a tu
    // izquierda se pierden por el borde, hacia el horizonte
    const mitad = enLinea(0).addScaledVector(ARRIBA, 5);
    portada = {
      posicion: mitad.clone().addScaledVector(lado, 34).addScaledVector(ARRIBA, 0.8),
      mira: mitad.clone().addScaledVector(ARRIBA, 0.3),
      lado,
    };
    focos.push(centro.clone().addScaledVector(ARRIBA, -3));
  }

  // ── El camino entre la estación 1 y la 2: solo la línea del tiempo y las bolitas que salen de ella en arcos y vuelven
  // a juntarse, de la dispersión del comienzo (arcos largos) al orden (arcos cortos). Cada bolita lleva el color de un
  // tipo de nota del Studio. Sin los postes con su farol que había antes de la estación 2, ni el trazo de cada arco (nota
  // de voz nmw17rx07tit). Empieza pasado el modelo de la estación 1, que ahora está más lejos (nmw197t4jtit)
  const DESDE = SITIO[0] + 0.08, HASTA = PARADA[1] - 0.03;
  {
    const nRamas = movil ? 12 : 20;
    const bolitas = [];
    for (let k = 0; k < nRamas; k++) {
      const s = k / (nRamas - 1);                      // 0, la dispersión; 1, el orden
      const ua = DESDE + s * (HASTA - DESDE - 0.025);
      const ub = Math.min(ua + azar(0.014, 0.03) + (1 - s) * 0.02, HASTA);
      const { p: pa } = marco(ua), { p: pb } = marco(ub), { lado } = marco((ua + ub) / 2);
      const amplitud = (1 - s) * azar(2.5, 5) + s * azar(1, 1.8);
      const costado = Math.random() < 0.5 ? -1 : 1;
      const m1 = pa.clone().lerp(pb, 0.33).addScaledVector(lado, costado * amplitud).addScaledVector(ARRIBA, amplitud * azar(0.3, 0.8));
      const m2 = pa.clone().lerp(pb, 0.66).addScaledVector(lado, costado * amplitud * 0.9).addScaledVector(ARRIBA, amplitud * azar(0.2, 0.6));
      const curva = new THREE.CatmullRomCurve3([pa, m1, m2, pb]);
      const bolita = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), brillo(COLORES_TIPO[k % COLORES_TIPO.length], 0.9));
      escena.add(bolita);
      bolitas.push({ curva, bolita, vel: azar(0.12, 0.3), fase: Math.random() });
    }
    // Cada bolita sale de la línea en su arco y vuelve a ella: el director junta lo que salió
    animar.push((t) => {
      bolitas.forEach((b) => b.bolita.position.copy(b.curva.getPointAt((t * b.vel + b.fase) % 1)));
      halo.opacity = 0.18 + 0.08 * Math.sin(t * 1.2) ** 2;
    });
  }

  // La estación 2: cuánto está abierto el reproductor de un problema (cam, de 0 a 1, suavizado), que lleva el anillo hacia el
  // menú y lo achica para dejarle sitio
  const pantalla2 = { cam: 0, abierta: false };
  // El anillo de íconos de la estación 2: su centro, su costado y su dirección; lo llena la estación
  const anillo = { centro: null, lado: null, tan: null, escala: 1 };

  // ── Estación 2, ¿te ha pasado…?: los seis grandes problemas giran despacio alrededor de la línea, como un anillo (nota de
  // voz nmw40cp3jtit), cada uno un ÍCONO 3D de su problema, en el estilo de los actores de la estación 1 (formas
  // redondeadas, brillo propio, de un solo color con el blanco: grises hasta que el ratón pasa o se abren, y entonces cada
  // uno en su color, nmw46qjootit): varias ventanas para la atención repartida en
  // sesiones, un globo de mensaje partido para lo que dices y se pierde, un hilo enredado para el contexto, una pila de
  // páginas para leer y releer, una caja negra con su «?» para el modelo que olvida y una señal de wifi cortada para la falta
  // de internet. Al pasar el ratón o al hacer clic, su globo con su nombre en dos palabras; al hacer clic, su reproductor
  {
    const u = SITIO[1];
    const { p, t, lado } = marco(u);
    // Los íconos, al 65 % de lo que medían (1,45): por lo menos el 60 % que pidió el titular (nmw40cp3jtit)
    const ESCALA_ICONO = 0.95;
    const frente = Math.atan2(-t.x, -t.z);   // para que el ícono mire hacia la cámara, que viene por detrás de la línea
    // El anillo: una elipse alrededor de la línea, de frente a la cámara (más ancha que alta, para no tocar el suelo), un poco
    // inclinada para que se vea en 3D, con los seis a la misma distancia uno del otro
    Object.assign(anillo, { centro: p.clone().addScaledVector(ARRIBA, 0.9), lado, tan: t });
    const ESFERAS = Array.from({ length: 7 }, (_, i) => ({ a: Math.PI / 2 + (i * 2 * Math.PI) / 7 }));
    const forma = (pts) => { const s = new THREE.Shape(); pts.forEach(([x, y], k) => (k ? s.lineTo(x, y) : s.moveTo(x, y))); s.closePath(); return s; };
    const extr = (s, prof, bisel = 0.03) => {
      const g = new THREE.ExtrudeGeometry(s, { depth: prof, bevelEnabled: true, bevelThickness: bisel, bevelSize: bisel, bevelSegments: 1, curveSegments: 10 });
      g.translate(0, 0, -prof / 2);
      return g;
    };
    const cajita = (w, h, d, material, r = 0.04) => new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), material);
    // «?» grande y claro, sin fondo, para la cara de la caja negra
    const textura = (texto, color) => {
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const x = c.getContext('2d');
      x.fillStyle = color; x.font = '700 190px system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(texto, 128, 140);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    };
    // Cada constructor recibe el material que se vuelve verde al abrir el problema (mat) y uno claro de apoyo (apoyo)
    const ICONOS = [
      // 1 · la atención repartida: cuatro ventanas, cada una una sesión, abiertas a la vez
      (mat, apoyo) => {
        const g = new THREE.Group();
        [[-0.42, 0.34, -0.16, 0.12], [0.4, 0.24, -0.02, -0.1], [-0.32, -0.34, 0.1, 0.09], [0.36, -0.4, 0.18, -0.08]].forEach(([x, y, z, giro]) => {
          const v = new THREE.Group();
          const barra = cajita(0.84, 0.15, 0.1, apoyo, 0.03); barra.position.y = 0.225;
          const l1 = cajita(0.5, 0.06, 0.1, apoyo, 0.02); l1.position.set(-0.14, 0.0, 0.01);
          const l2 = cajita(0.36, 0.06, 0.1, apoyo, 0.02); l2.position.set(-0.21, -0.12, 0.01);
          v.add(cajita(0.84, 0.6, 0.09, mat), barra, l1, l2);
          v.position.set(x, y, z); v.rotation.z = giro;
          g.add(v);
        });
        return g;
      },
      // 2 · lo que dices se pierde: un globo de mensaje partido en dos, incompleto, con sus puntos suspensivos
      (mat, apoyo) => {
        const g = new THREE.Group();
        const izq = new THREE.Mesh(extr(forma([[-0.58, 0.2], [-0.46, 0.34], [0, 0.34], [-0.1, 0.14], [0.04, -0.06], [-0.06, -0.3], [-0.2, -0.3], [-0.34, -0.5], [-0.36, -0.3], [-0.46, -0.3], [-0.58, -0.18]]), 0.14), mat);
        const der = new THREE.Mesh(extr(forma([[0.1, 0.34], [0.46, 0.34], [0.58, 0.2], [0.58, -0.18], [0.46, -0.3], [0.06, -0.3], [0.2, -0.06], [0.08, 0.14]]), 0.14), mat);
        izq.position.x = -0.07; izq.rotation.z = 0.08;
        der.position.set(0.07, -0.03, 0); der.rotation.z = -0.1;
        g.add(izq, der);
        [0.28, 0.4, 0.52].forEach((x) => { const punto = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), apoyo); punto.position.set(x, 0.04, 0.1); g.add(punto); });
        return g;
      },
      // 3 · el contexto que se enreda: un hilo hecho un nudo, con sus dos puntas sueltas
      (mat, apoyo) => {
        const g = new THREE.Group();
        const pts = [];
        for (let k = 0; k <= 90; k++) { const a = (k / 90) * Math.PI * 6; pts.push(new THREE.Vector3(Math.sin(a * 0.9) * 0.56 + Math.sin(a * 2.3) * 0.2, Math.cos(a * 0.7) * 0.5 + Math.cos(a * 1.9) * 0.18, Math.sin(a * 1.3) * 0.36)); }
        g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 240, 0.075, 8, false), mat));
        [pts[0], pts[90]].forEach((v) => { const punta = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), apoyo); punta.position.copy(v); g.add(punta); });
        return g;
      },
      // 4 · leer y releer: una pila de páginas, la de arriba con sus renglones
      (mat, apoyo) => {
        const g = new THREE.Group();
        for (let k = 0; k < 4; k++) {
          const hoja = new THREE.Group();
          hoja.add(cajita(0.95, 1.2, 0.08, k === 3 ? apoyo : mat, 0.03));
          if (k === 3) [0.38, 0.18, -0.02, -0.22].forEach((y, m) => { const r = cajita(m === 3 ? 0.34 : 0.6, 0.07, 0.09, mat, 0.02); r.position.set(m === 3 ? -0.21 : -0.1, y, 0.02); hoja.add(r); });
          hoja.position.set(0, 0, -0.2 + k * 0.14); hoja.rotation.z = (k - 1.5) * 0.09;
          g.add(hoja);
        }
        return g;
      },
      // 5 · el modelo olvida: una caja de su color con su «?» blanco, sobre una base blanca (un solo color con el blanco:
      // nmw46qjootit)
      (mat, apoyo) => {
        const g = new THREE.Group();
        const cara = new THREE.Mesh(new THREE.PlaneGeometry(1.06, 1.06), new THREE.MeshBasicMaterial({ map: textura('?', '#ffffff'), transparent: true, depthWrite: false }));
        cara.position.z = 0.585;
        const base = cajita(1.5, 0.12, 1.5, apoyo, 0.04); base.position.y = -0.68;
        g.add(cajita(1.15, 1.15, 1.15, mat, 0.18), cara, base);
        g.position.y = 0.1;
        return g;
      },
      // 6 · sin internet: la señal de wifi con su corte
      (mat, apoyo) => {
        const g = new THREE.Group();
        const arco = (r0, r1) => {
          const s = new THREE.Shape();
          s.absarc(0, 0, r1, Math.PI * 0.25, Math.PI * 0.75, false);
          s.absarc(0, 0, r0, Math.PI * 0.75, Math.PI * 0.25, true);
          s.closePath();
          const m = new THREE.Mesh(extr(s, 0.14, 0.02), mat);
          m.position.y = -0.4;
          return m;
        };
        g.add(arco(0.2, 0.36), arco(0.5, 0.66), arco(0.8, 0.96));
        const punto = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), mat); punto.position.y = -0.4;
        const corte = cajita(0.15, 1.9, 0.18, apoyo, 0.06); corte.rotation.z = -0.75; corte.position.set(0.04, 0.02, 0.14);
        g.add(punto, corte);
        return g;
      },
      // 7 · la pereza de escribir: un micrófono para dictar, su cabeza de su color con su rejilla blanca, su soporte en U y su
      // pie (pd_dictado; el verde claro, nmw4it925tit)
      (mat, apoyo) => {
        const g = new THREE.Group();
        const cabeza = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.42, 6, 16), mat); cabeza.position.y = 0.28;
        [0.42, 0.28, 0.14].forEach((y) => { const raya = cajita(0.5, 0.045, 0.2, apoyo, 0.02); raya.position.set(0, y, 0.24); g.add(raya); });
        const arco = Array.from({ length: 13 }, (_, k) => { const a = Math.PI + (k / 12) * Math.PI; return new THREE.Vector3(Math.cos(a) * 0.46, Math.sin(a) * 0.46, 0); });
        const u = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arco), 24, 0.05, 8, false), apoyo); u.position.y = 0.16;
        const pie = cajita(0.1, 0.42, 0.1, apoyo, 0.03); pie.position.y = -0.5;
        const base = cajita(0.7, 0.1, 0.36, apoyo, 0.04); base.position.y = -0.72;
        g.add(cabeza, u, pie, base);
        return g;
      },
    ];
    // Las medidas del anillo: sus radios (a lo ancho y a lo alto), cuánto se inclina, cuánto se achica con el reproductor
    // abierto y su giro (radianes por segundo: una vuelta en algo más de un minuto, despacio)
    const RADIO_X = 6.2, RADIO_Y = 3.5, INCLINA = 1.1, ANILLO_ABIERTO = 0.52, GIRO_ANILLO = 0.095;
    const lugarEnAnillo = (a, s, fuera = new THREE.Vector3()) => fuera.copy(anillo.centro)
      .addScaledVector(lado, Math.cos(a) * RADIO_X * s).addScaledVector(ARRIBA, Math.sin(a) * RADIO_Y * s).addScaledVector(t, Math.sin(a) * INCLINA * s);
    Object.assign(anillo, { radioX: RADIO_X, radioY: RADIO_Y, abierto: ANILLO_ABIERTO });
    ESFERAS.forEach((pos, i) => {
      const casa = lugarEnAnillo(pos.a, 1);
      // Empieza en gris; su color, al pasar el ratón, al abrirlo y después de abierto (moverAnillo)
      const mat = brillo(GRIS_PROBLEMA, 0.2), apoyo = brillo('#ffffff', 0.3);
      const orbe = ICONOS[i](mat, apoyo);
      orbe.position.copy(casa);
      // El área que se toca con el ratón: una esfera invisible alrededor del ícono
      const hit = new THREE.Mesh(new THREE.SphereGeometry(1.05, 10, 8), new THREE.MeshBasicMaterial({ visible: false }));
      orbe.add(hit);
      // Su nombre, en dos palabras, el que dice su globo (nmw40cp3jtit)
      const titulo = EN ? TITULOS_CORTOS_EN[i] : (problemas[i]?.dataset.corto ?? `Problema ${i + 1}`);
      hit.userData.i = i;
      escena.add(orbe);
      orbes.push({ orbe, hit, titulo, mat, casa, a: pos.a, fase: Math.random() * 6, grande: 1, color: new THREE.Color(COLOR_PROBLEMA[i]) });
    });
    const gris = new THREE.Color(GRIS_PROBLEMA);
    // Cada cuadro: el anillo gira, y con el reproductor abierto se achica (sus íconos, un poco menos) para dejarle sitio. Cada
    // ícono va en gris hasta que el ratón pasa por él o se abre, y entonces toma su color (nmw46qjootit)
    function moverAnillo(s) {
      const abierto = suave(pantalla2.cam);
      anillo.escala = lerp(1, ANILLO_ABIERTO, abierto);
      orbes.forEach((o, i) => {
        const visto = enColor(i, sobre, seleccionado, resueltos);
        const tono = visto ? o.color : gris;
        o.mat.color.lerp(tono, quieto ? 1 : 0.15); o.mat.emissive.lerp(tono, quieto ? 1 : 0.15);
        o.grande += ((seleccionado === i ? 1.25 : sobre === i ? 1.12 : 1) - o.grande) * (quieto ? 1 : 0.12);
        o.orbe.scale.setScalar(o.grande * ESCALA_ICONO * lerp(1, 0.78, abierto));
        lugarEnAnillo(o.a + s * GIRO_ANILLO, anillo.escala, o.casa);
        o.orbe.position.copy(o.casa).addScaledVector(ARRIBA, Math.sin(s * 1.4 + o.fase) * 0.1);
        o.orbe.rotation.y = frente + Math.sin(s * 0.9 + o.fase) * 0.4;
        o.mat.emissiveIntensity = visto ? 0.55 : 0.15 + 0.15 * Math.sin(s * 2 + o.fase) ** 2;
      });
    }
    anillo.mover = moverAnillo;
    animar.push(deEstacion(1, moverAnillo));
    // La cámara mira el centro del anillo
    focos.push(anillo.centro.clone());
  }

  // ── Estación 3, «Cómo empezar» (pd_como_empezar): el camino de la 2 a la 3 es la línea sola, como el de la 1 a la 2 pero
  // sin notas que viajan (nmw4isvr9tit); al llegar, su reproductor se abre a la izquierda y la línea queda a la derecha
  // (nmw4ircrjtit). La cámara mira la línea, un poco arriba
  focos.push(marco(SITIO[2]).p.clone().addScaledVector(ARRIBA, 0.9));

  // ── La cámara: arriba, una vista de costado de la línea; al bajar, se mete en ella y la sigue
  const INTRO_POS = portada.posicion.clone().addScaledVector(portada.lado, 17).addScaledVector(ARRIBA, 5);
  const INTRO_MIRA = portada.mira.clone().addScaledVector(ARRIBA, 0.8);
  const masSuave = (x) => x * x * x * (x * (6 * x - 15) + 10);   // lenta al llegar y al salir de cada estación
  const pose = (u) => {
    const { p, t, lado } = marco(u);
    const posicion = p.clone().addScaledVector(t, -7.5).addScaledVector(ARRIBA, 2.8).addScaledVector(lado, 1.4);
    const adelante = camino.getPointAt(Math.min(u + 0.03, 1)).addScaledVector(ARRIBA, 0.9);
    // Cerca de una estación, la mirada se va hacia lo que hay que ver
    let peso = 0, foco = null;
    PARADA.forEach((s, i) => {
      const w = Math.max(0, 1 - Math.abs(u - s) / 0.06);
      if (w > peso) { peso = w; foco = focos[i]; }
    });
    const mira = foco ? adelante.lerp(foco, suave(peso) * 0.8) : adelante;
    return { posicion, mira };
  };

  // ── El scroll: 0 es la vista de costado; 1, la primera estación; 2, la segunda
  let anclas = [];
  function medir() {
    const y = scrollY, alto = innerHeight;
    const inicio = document.getElementById('viaje').getBoundingClientRect().top + y;
    // Cada estación se alcanza cuando su centro pasa por el centro de la pantalla
    anclas = [inicio, ...estaciones.map((el) => { const r = el.getBoundingClientRect(); return r.top + y + r.height / 2 - alto / 2; })];
    const w = lienzo.clientWidth, h = lienzo.clientHeight;
    renderer.setSize(w, h, false);
    camara.aspect = w / Math.max(h, 1);
    camara.fov = w < h ? 68 : 55;
    camara.updateProjectionMatrix();
  }
  function objetivo() {
    if (fijo !== null) return fijo;
    const y = scrollY;
    if (y <= anclas[0]) return 0;
    for (let k = 0; k < anclas.length - 1; k++) {
      if (y < anclas[k + 1]) return k + (y - anclas[k]) / Math.max(anclas[k + 1] - anclas[k], 1);
    }
    return anclas.length - 1;
  }
  const ultima = PARADA.length;
  // El problema abierto (−1, ninguno) y el que está bajo el ratón. Al abrir uno, la cámara no se mueve: el recuadro lo
  // tapaba y el acercamiento la dejaba pegada a la estación 2 (t_decide_acercar_problema, nota nmw19elcqtit)
  let seleccionado = -1, sobre = -1;
  function colocar(w) {
    let posicion, mira;
    if (w < 1) {
      const e = masSuave(Math.max(0, w));
      posicion = INTRO_POS.clone().lerp(portada.posicion, e);
      mira = INTRO_MIRA.clone().lerp(portada.mira, e);
    } else {
      // w = 1 es la primera estación y w = 2 la segunda; entre una y otra, la cámara avanza por la línea
      const k = Math.floor(w), f = w - k;
      const u = k >= ultima ? PARADA[ultima - 1] : PARADA[k - 1] + (PARADA[k] - PARADA[k - 1]) * masSuave(f);
      ({ posicion, mira } = pose(u));
      // Saliendo de la estación 1, de la vista de costado a la de la línea
      if (k === 1) {
        const e = masSuave(Math.min(1, f * 2));
        posicion = portada.posicion.clone().lerp(posicion, e);
        mira = portada.mira.clone().lerp(mira, e);
      }
    }
    camara.position.copy(posicion);
    camara.lookAt(mira);
    farol.position.copy(posicion).addScaledVector(ARRIBA, 1.5);
    encuadrarDos(w);
  }

  // ── El encuadre de la estación 2 (nota de voz nmw40cp3jtit): la cámara no se mueve, pero la imagen se corre
  // (setViewOffset) para que el anillo quede en el centro de lo que deja libre el menú, y con un reproductor abierto, pegado
  // al menú, con el reproductor en todo lo que queda a su izquierda (disponerReproductor). Lejos de la estación 2, nada se corre
  const MANDOS_ALTO = 64;   // lo que ocupan los mandos, debajo de la animación, dentro del reproductor
  const menuLista = document.querySelector('.menu ol'), lineaDos = document.querySelector('[data-titulo-dos]');
  const enPantalla = new THREE.Vector3();
  const aPantalla = (v, ancho, alto) => { enPantalla.copy(v).project(camara); return { x: (enPantalla.x + 1) / 2 * ancho, y: (1 - enPantalla.y) / 2 * alto }; };
  let disposicion = null;   // dónde quedan el reproductor y el anillo, para el cuadro que se dibuja
  // «Cómo empezar», en la estación 3 (nmw4ircrjtit): su reproductor a la izquierda, con la fila del ejemplo y del enlace
  // (EXTRA_ALTO) sobre sus mandos, y la línea a la derecha, donde en la 2 queda el anillo; la imagen se corre para que la
  // línea quede ahí cuando el reproductor está abierto, y al centro de lo libre cuando no
  const EXTRA_ALTO = 40;
  const lineaTres = document.querySelector('[data-linea-tres]');
  function encuadrarTres(w, ancho, alto) {
    const cerca = suave(tope(1 - Math.abs(w - 3) / 0.6));
    if (cerca <= 0.001 || !focos[2] || !ancho || !alto) return false;
    camara.updateMatrixWorld();
    const menuIzq = movil || !menuLista ? ancho : menuLista.getBoundingClientRect().left;
    const linea = lineaTres?.getBoundingClientRect();
    const lineaArriba = linea && linea.height && linea.top < alto ? linea.top : alto;
    const d = disponerReproductor({ ancho, alto, menuIzq, lineaArriba, anilloMedio: menuIzq * 0.12, anilloAlto: 0, mandos: MANDOS_ALTO + EXTRA_ALTO });
    const c = aPantalla(focos[2], ancho, alto), e = seleccionado === GUIA ? suave(pantalla2.cam) : 0;
    camara.setViewOffset(ancho, alto, -(lerp(menuIzq / 2, d.anilloX, e) - c.x) * cerca, 0, ancho, alto);
    disposicion = { ...d, menuIzq, lineaArriba, ancho, alto };
    return true;
  }
  function encuadrarDos(w) {
    const ancho = lienzo.clientWidth, alto = lienzo.clientHeight;
    const cerca = suave(tope(1 - Math.abs(w - 2) / 0.6));
    camara.clearViewOffset();
    disposicion = null;
    if (encuadrarTres(w, ancho, alto)) return;
    if (cerca <= 0.001 || !anillo.centro || !ancho || !alto) return;
    camara.updateMatrixWorld();
    // El anillo como se ve ahora, sin correrse: su centro y la mitad de su ancho y de su alto, con el aire de sus íconos
    const c = aPantalla(anillo.centro, ancho, alto);
    const ladoX = aPantalla(anillo.centro.clone().addScaledVector(anillo.lado, anillo.radioX * anillo.escala), ancho, alto);
    const arribaY = aPantalla(anillo.centro.clone().addScaledVector(ARRIBA, anillo.radioY * anillo.escala), ancho, alto);
    const aire = Math.max(36, alto * 0.06);
    const deAbierto = anillo.abierto / Math.max(anillo.escala, 0.01);
    const medioAncho = Math.abs(ladoX.x - c.x), medioAlto = Math.abs(arribaY.y - c.y);
    const menuIzq = movil || !menuLista ? ancho : menuLista.getBoundingClientRect().left;
    const linea = lineaDos?.getBoundingClientRect();
    const lineaArriba = linea && linea.height && linea.top < alto ? linea.top : alto;
    const d = disponerReproductor({ ancho, alto, menuIzq, lineaArriba, anilloMedio: medioAncho * deAbierto + aire, anilloAlto: medioAlto * deAbierto + aire, mandos: MANDOS_ALTO });
    // Cerrado, el anillo va al centro de lo libre (entre el borde y el menú, y sobre la línea de abajo); abierto, junto al menú
    const e = suave(pantalla2.cam);
    const dx = lerp(menuIzq / 2, d.anilloX, e) - c.x, dy = lerp(Math.min(alto / 2, lineaArriba / 2 + 8), d.anilloY, e) - c.y;
    camara.setViewOffset(ancho, alto, -dx * cerca, -dy * cerca, ancho, alto);
    disposicion = { ...d, menuIzq, lineaArriba, ancho, alto };
  }

  // ── La estación actual: su tarjeta se enciende
  let actual = -2;
  function marcar(w) {
    const k = Math.round(w) - 1;
    if (k === actual) return;
    actual = k;
    estaciones.forEach((el, i) => el.classList.toggle('actual', i === k));
    if (fijo !== null && estaciones[k]) resaltar(estaciones[k].id);
  }

  // ── El menú lleva a la estación justo donde la cámara se detiene, no al borde de arriba de su bloque, desde cualquier
  // estación: antes, con un problema abierto, el recuadro seguía abierto y la cámara se quedaba en la estación 2 (nota de
  // voz nmw19elcqtit). Con ?ver=N, abre esa otra estación, también fija
  enlaces.forEach((a) => a.addEventListener('click', (e) => {
    const i = estaciones.findIndex((el) => `#${el.id}` === a.getAttribute('href'));
    if (i < 0) return;
    e.preventDefault();
    cerrarPopup();
    if (fijo !== null) return void (location.search = `?ver=${i + 1}`);
    empezarEstacion(i);   // su animación vuelve a empezar (nmw1khrketit)
    medir();
    scrollTo({ top: anclas[i + 1], behavior: quieto ? 'auto' : 'smooth' });
    history.replaceState(null, '', a.getAttribute('href'));
  }));

  // ── El reproductor de un problema (mundo-3d.html › .popup): su animación, a la vista, y sus mandos adentro, debajo
  // (nota de voz nmw40cp3jtit); dónde va y qué tan grande, en ponerReproductor
  const popup = document.getElementById('popup');
  const clip = document.getElementById('popup-clip');
  const ctxClip = clip?.getContext('2d');
  // El reloj del clip: los segundos que lleva (clipT) y el último cuadro (clipAntes). Avanza con cada cuadro, y se queda
  // quieto en el cambio de rótulo mientras la voz no termina de decir el que está (pd_narrador)
  let clipT = 0, clipAntes = 0;
  // El enunciado de cada animación, el mismo texto de su problema en la lista (nmw1olvthtit)
  problemas.forEach((d, i) => { ENUNCIADOS[i] = d.querySelector('summary')?.textContent.trim() ?? ''; });
  // ── La voz: Kokoro em_santa, en español, dice lo mismo que el rótulo (nmw1ga4dftit); suena al abrir la animación
  // (nmw1c9m5ltit) y se calla con su botón, que el navegador recuerda
  const VOZ_GUARDADA = 'stl-recorrido-voz';
  let conVoz = true;
  try { conVoz = localStorage.getItem(VOZ_GUARDADA) !== 'no'; } catch { /* sin almacenamiento, con voz */ }
  const botonVoz = popup?.querySelector('[data-voz-clip]');
  const pintarBotonVoz = () => {
    if (!botonVoz) return;
    botonVoz.setAttribute('aria-pressed', String(conVoz));
    botonVoz.textContent = conVoz ? '🔊 Voz' : '🔇 Sin voz';
  };
  pintarBotonVoz();
  const voces = new Map();   // un Audio por clave, pedido antes de que suene
  // La velocidad de reproducción, como en la animación del principio (1x, 1,25x, 1,5x o 2x; nota de voz nmw2n33o6tit):
  // acelera la voz y el reloj del clip la sigue. El navegador la recuerda
  const VELOCIDADES_CLIP = [1, 1.25, 1.5, 2], VELOCIDAD_GUARDADA = 'stl-recorrido-velocidad';
  let velClip = 1;
  try { const v = Number(localStorage.getItem(VELOCIDAD_GUARDADA)); if (VELOCIDADES_CLIP.includes(v)) velClip = v; } catch { /* sin almacenamiento, a 1x */ }
  // La voz de Kokoro, un 35 % más rápida, como la animación, sin que cambie su tono (nmw1kwbsftit); la de Google, a su
  // ritmo natural (ritmoDeClave); las dos a la velocidad elegida
  const aSuRitmo = (a) => {
    const r = a.ritmo ?? RAPIDEZ;
    a.defaultPlaybackRate = r; a.playbackRate = r * velClip;
    a.preservesPitch = true; a.mozPreservesPitch = true; a.webkitPreservesPitch = true;
    return a;
  };
  const audioDe = (clave) => {
    if (!voces.has(clave)) { const a = new Audio(); a.preload = 'auto'; a.src = `voz/es/${clave}.mp3`; a.ritmo = ritmoDeClave(clave); voces.set(clave, aSuRitmo(a)); }
    return voces.get(clave);
  };
  const voz = { clave: '', audio: null, hablando: false, desde: 0 };
  function callar() {
    if (voz.audio) { voz.audio.pause(); voz.audio.onended = voz.audio.onerror = null; }
    voz.audio = null; voz.clave = ''; voz.hablando = false;
  }
  // «desde»: en qué segundo de su clip empieza (al llegar al paso, 0; al mover la perilla a la mitad de un paso con voz de
  // Google, lo que ya pasó de él, así la voz dice lo que se ve)
  function decir(clave, desde = 0) {
    if (clave === voz.clave) return;
    callar();
    voz.clave = clave;
    if (!conVoz || quieto || sinVozTodavia(clave)) return;   // sin voz todavía: ni se pide su mp3 ni el reloj la espera
    const a = audioDe(clave), listo = () => { if (voz.audio === a) voz.hablando = false; };
    voz.audio = a; voz.hablando = true; voz.desde = performance.now();
    a.onended = a.onerror = listo;
    a.currentTime = desde;
    aSuRitmo(a);
    // Si el navegador no la deja sonar (nadie ha hecho clic en la página), «Cómo empezar» espera con «▶ Empezar con voz»
    a.play().catch((e) => { listo(); if (e?.name === 'NotAllowedError') alNoPoderSonar(); });
  }
  // Si un clip no llega o se traba, el rótulo no espera para siempre
  const sigueHablando = () => voz.hablando && performance.now() - voz.desde < 20000;
  // La voz que toca aún carga: pedida, sin haber empezado a sonar y sin lo suficiente para hacerlo (HAVE_FUTURE_DATA)
  const cargandoVoz = () => !!voz.audio && sigueHablando() && voz.audio.readyState < 3 && !voz.audio.ended;
  botonVoz?.addEventListener('click', () => {
    conVoz = !conVoz;
    try { localStorage.setItem(VOZ_GUARDADA, conVoz ? 'si' : 'no'); } catch { /* sin almacenamiento */ }
    callar();   // y al volver a encenderla, dice el rótulo que está
    pintarBotonVoz();
  });
  const botonesVelocidad = [...(popup?.querySelectorAll('[data-velocidad-clip] button') ?? [])];
  const pintarVelocidad = () => botonesVelocidad.forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.v) === velClip)));
  pintarVelocidad();
  // Otra velocidad: la voz que habla sigue desde donde va, ya a la nueva, y el clip con ella
  botonesVelocidad.forEach((b) => b.addEventListener('click', () => {
    const v = Number(b.dataset.v);
    if (!VELOCIDADES_CLIP.includes(v)) return;
    velClip = v;
    try { localStorage.setItem(VELOCIDAD_GUARDADA, String(v)); } catch { /* sin almacenamiento */ }
    if (voz.audio) aSuRitmo(voz.audio);
    pintarVelocidad();
  }));
  // ── La perilla chica del clip, en vez de «↻ Repetir», como la de la animación del principio (linea-del-proyecto.html ›
  // #perilla y #pausa; nota de voz nmw1kwbsftit): la rueda del ratón sobre ella o sobre la animación la adelanta (hacia
  // abajo) o la devuelve (hacia arriba), también girándola con el ratón o con las flechas, y el botón del centro la pausa
  // o la sigue; al final, seguir es verla otra vez desde el principio
  let pausado = false;
  const perillaClip = popup?.querySelector('[data-perilla-clip]');
  const giroClip = popup?.querySelector('[data-giro-clip]');
  const pausaClip = popup?.querySelector('[data-pausa-clip]');
  const VUELTA_CLIP = 20;   // segundos de animación por vuelta de la perilla
  const ICONO_PAUSA = 'M7 5h3.6v14H7zM13.4 5H17v14h-3.6z', ICONO_SEGUIR = 'M8.5 5.2v13.6L19 12z';
  if (perillaClip) {   // sus marcas y sus estrías, como las de la perilla grande
    const SVG = 'http://www.w3.org/2000/svg';
    const rayas = (g, n, r0, r1, color, alfa, ancho, cada) => {
      for (let k = 0; k < n; k++) {
        const a = (k / n) * 2 * Math.PI, largo = cada && k % cada === 0 ? 3 : 0;
        const l = document.createElementNS(SVG, 'line');
        l.setAttribute('x1', 60 + Math.sin(a) * (r0 - largo)); l.setAttribute('y1', 60 - Math.cos(a) * (r0 - largo));
        l.setAttribute('x2', 60 + Math.sin(a) * r1); l.setAttribute('y2', 60 - Math.cos(a) * r1);
        l.setAttribute('stroke', color); l.setAttribute('stroke-opacity', largo ? alfa * 1.8 : alfa);
        l.setAttribute('stroke-width', ancho); l.setAttribute('stroke-linecap', 'round');
        g.appendChild(l);
      }
    };
    const marcas = perillaClip.querySelector('[data-marcas-clip]'), estrias = perillaClip.querySelector('[data-estrias-clip]');
    if (marcas) rayas(marcas, 40, 51, 54.5, ORO, 0.35, 1.2, 5);
    if (estrias) rayas(estrias, 30, 31, 42, MORADO, 0.13, 1.4);
  }
  const terminado = () => seleccionado >= 0 && clipT >= duraClip(seleccionado);
  let segundoClip = -1;
  function pintarMando() {
    const corre = !pausado && !terminado();
    pausaClip?.querySelector('path')?.setAttribute('d', corre ? ICONO_PAUSA : ICONO_SEGUIR);
    pausaClip?.setAttribute('aria-label', corre ? 'Pausar la animación' : terminado() ? 'Verla otra vez' : 'Seguir la animación');
    giroClip?.setAttribute('transform', `rotate(${((clipT / VUELTA_CLIP) * 360) % 360} 60 60)`);
    const s = Math.floor(clipT);
    if (perillaClip && s !== segundoClip) {
      segundoClip = s;
      perillaClip.setAttribute('aria-valuenow', String(s));
      perillaClip.setAttribute('aria-valuetext', `segundo ${s} de ${Math.round(seleccionado >= 0 ? duraClip(seleccionado) : 0)}`);
    }
  }
  // El reloj de la pantalla de un problema: se cierra sola 4 s después de que su animación termina, salvo que la persona la
  // haya repetido («↻ Repetir» o «Verla otra vez»): entonces se queda abierta hasta que ella la cierre
  const autocierre = relojAutocierre();
  // «manual»: la persona la repite; la primera vez que se abre una pantalla, no
  function empezarClip(manual = false) {
    callar();
    clipT = 0; clipAntes = performance.now();
    pausado = false;
    if (manual) autocierre.repetir();
    pintarMando();
    if (ctxClip && seleccionado >= 0) { pintarClip(ctxClip, seleccionado, 0) }
  }
  // Pausar o seguir, con su voz: la que estaba hablando se detiene y sigue donde iba
  function pausar(si) {
    pausado = si;
    if (voz.audio) {
      if (si) voz.audio.pause();
      else if (voz.hablando) { voz.desde = performance.now(); voz.audio.play().catch(() => { voz.hablando = false; }); }
    }
    clipAntes = performance.now();
    pintarMando();
  }
  function alternarClip() {
    if (seleccionado < 0) return;
    if (terminado()) empezarClip(true);   // al final, seguir es verla otra vez, con su voz (y ya no se cierra sola)
    else pausar(!pausado);
    if (quieto && ctxClip) { pintarClip(ctxClip, seleccionado, clipT) }
  }
  // Mover la animación tantos segundos (positivos: adelante; negativos: atrás). Si cambia el rótulo, la voz dice el nuevo
  function moverClip(seg) {
    if (seleccionado < 0) return;
    const antes = pasoDeClip(seleccionado, clipT).clave;
    clipT = Math.max(0, Math.min(duraClip(seleccionado), clipT + seg));
    clipAntes = performance.now();
    // Con la voz de Google, la voz va donde quedó la animación, aunque sea el mismo paso (la voz manda: si siguiera donde
    // iba, devolvería la animación)
    if (pasoDeClip(seleccionado, clipT).clave !== antes || tramoDeVoz(seleccionado, clipT)) callar();
    if (ctxClip) { pintarClip(ctxClip, seleccionado, clipT) }
    pintarMando();
  }
  pausaClip?.addEventListener('click', alternarClip);
  // «↻ Repetir»: la animación vuelve a empezar, con su voz, y la pantalla se queda abierta sin cerrarse sola
  popup?.querySelector('[data-repetir-clip]')?.addEventListener('click', () => { if (seleccionado >= 0) empezarClip(true); });
  let arrastreClip = null;
  const anguloClip = (e) => {
    const b = perillaClip.getBoundingClientRect();
    return Math.atan2(e.clientY - (b.top + b.height / 2), e.clientX - (b.left + b.width / 2));
  };
  perillaClip?.addEventListener('pointerdown', (e) => {
    if (e.target.closest('[data-pausa-clip]') || e.button > 0) return;
    e.preventDefault(); perillaClip.focus();
    perillaClip.setPointerCapture(e.pointerId);
    arrastreClip = { a: anguloClip(e), seguia: !pausado };
    pausar(true);
    perillaClip.classList.add('gira');
  });
  perillaClip?.addEventListener('pointermove', (e) => {
    if (!arrastreClip) return;
    const a = anguloClip(e);
    let d = a - arrastreClip.a;
    if (d > Math.PI) d -= 2 * Math.PI; else if (d < -Math.PI) d += 2 * Math.PI;
    arrastreClip.a = a;
    moverClip((d / (2 * Math.PI)) * VUELTA_CLIP);
  });
  const soltarClip = () => {
    if (!arrastreClip) return;
    const seguia = arrastreClip.seguia;
    arrastreClip = null;
    perillaClip.classList.remove('gira');
    pausar(!seguia);
  };
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) perillaClip?.addEventListener(ev, soltarClip);
  // La rueda sobre el reproductor (la animación, sus mandos o la perilla): cada muesca, un segundo y medio (en un touchpad,
  // poco a poco), y la animación sigue como iba; se queda así (nmw40cp3jtit). Ahí la rueda no lo cierra; fuera de él, sí
  const ruedaClip = (e) => {
    e.stopPropagation();
    if (e.ctrlKey) return;
    const muescas = e.deltaMode === 1 ? e.deltaY / 3 : e.deltaMode === 2 ? e.deltaY * 3 : e.deltaY / 100;
    if (!muescas) return;
    e.preventDefault();
    moverClip(Math.max(-4.5, Math.min(4.5, muescas * 1.5)));
  };
  popup?.addEventListener('wheel', ruedaClip, { passive: false });
  // Un clic en la barra de lo que va, abajo de la animación, la lleva a ese punto; sobre ella, el puntero es una mano
  // (nota de voz nmw1oc8mctit)
  const enBarra = (e) => {
    const b = clip.getBoundingClientRect();
    return puntoDeBarra(e.clientX - b.left, e.clientY - b.top, b.width, b.height);
  };
  clip?.addEventListener('click', (e) => {
    const f = seleccionado < 0 ? null : enBarra(e);
    if (f !== null) moverClip(f * duraClip(seleccionado) - clipT);
  });
  clip?.addEventListener('pointermove', (e) => { clip.style.cursor = enBarra(e) === null ? '' : 'pointer'; });
  perillaClip?.addEventListener('keydown', (e) => {
    if (e.target === pausaClip) return;   // el botón del centro ya se oprime solo con Espacio o Enter
    const seg = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 5, PageDown: -5 }[e.key];
    if (seg) { e.preventDefault(); moverClip(seg); }
    else if (e.key === 'Home') { e.preventDefault(); moverClip(-clipT); }
    else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); alternarClip(); }
  });
  // Un cuadro del clip: con la voz de Google sonando, el reloj es el de la voz (tramoDeVoz; nmw2qhhsjtit); si no, avanza
  // (en pausa, no), salvo si el rótulo cambiaría mientras la voz aún habla. Y dice el rótulo nuevo
  function avanzarClip() {
    const ahora = performance.now(), dt = Math.min(0.1, Math.max(0, (ahora - clipAntes) / 1000));
    clipAntes = ahora;
    // Mientras la voz que toca no ha cargado lo suficiente para sonar, la animación espera quieta con su «Cargando la
    // voz…» (nmw5d6iqctit); si no llega en 20 s, sigue sin ella (sigueHablando)
    if (!pausado && cargandoVoz()) { pintarClip(ctxClip, seleccionado, clipT); pintarCargando(ctxClip, clip.width, clip.height, ahora / 1000); pintarMando(); return; }
    if (!pausado) {
      const tr = tramoDeVoz(seleccionado, clipT), a = voz.audio;
      if (tr && a && voz.hablando && voz.clave === tr.clave && !a.paused) clipT = tr.desde + Math.min(tr.voz, a.currentTime / (a.ritmo ?? 1));
      else {
        const ya = pasoDeClip(seleccionado, clipT), luego = pasoDeClip(seleccionado, clipT + dt * velClip);
        if (luego.clave === ya.clave || !sigueHablando()) clipT = Math.min(duraClip(seleccionado), clipT + dt * velClip);
      }
      const ahoraEn = pasoDeClip(seleccionado, clipT).clave, trNuevo = tramoDeVoz(seleccionado, clipT);
      const dicho = trNuevo && trNuevo.clave === ahoraEn ? clipT - trNuevo.desde : 0;
      // En el respiro de un paso ya dicho (la perilla lo dejó ahí), callada: si lo dijera otra vez, devolvería la animación
      if (trNuevo && ahoraEn !== voz.clave && dicho >= trNuevo.voz) { callar(); voz.clave = ahoraEn; }
      else decir(ahoraEn, dicho * ritmoDeClave(ahoraEn));
    }
    pintarClip(ctxClip, seleccionado, clipT);
    pintarMando();
  }
  // El reproductor, donde dice disponerReproductor: crece a la izquierda del anillo hasta donde deja la pantalla, con sus
  // mandos adentro, debajo de la animación (nota de voz nmw40cp3jtit). Al abrirse, sale del ícono que lo soltó
  let origenPopup = null;
  function ponerReproductor() {
    if (!popup || popup.hidden || !disposicion) return;
    const { x, y, w, h } = disposicion;
    popup.style.left = `${Math.round(x)}px`; popup.style.top = `${Math.round(y)}px`;
    popup.style.width = `${Math.round(w)}px`; popup.style.height = `${Math.round(h)}px`;
    if (origenPopup) { popup.style.transformOrigin = `${Math.round(origenPopup.x - x)}px ${Math.round(origenPopup.y - y)}px`; origenPopup = null; }
  }
  // ── El globo de cada ícono, con su nombre en dos palabras: sale al pasar el ratón o al hacer clic (el del problema abierto
  // se queda mientras su reproductor está abierto), hacia afuera del anillo, y nunca pisa otro ícono, el reproductor, el menú
  // ni la línea de abajo (lugarDelGlobo)
  const globo = document.getElementById('globo-problema');
  const radioEnPantalla = (o) => {
    const c = aPantalla(o.orbe.position, disposicion.ancho, disposicion.alto);
    const borde = aPantalla(o.orbe.position.clone().addScaledVector(ARRIBA, 0.8 * o.orbe.scale.x), disposicion.ancho, disposicion.alto);
    return { x: c.x, y: c.y, r: Math.max(14, Math.abs(borde.y - c.y)) };
  };
  function ponerGlobo() {
    if (!globo) return;
    const i = sobre >= 0 ? sobre : seleccionado;
    if (i < 0 || !orbes[i] || !disposicion || cur < 1.5 || cur > 2.6 || visorAbierto()) { globo.hidden = true; return; }
    if (globo.dataset.i !== String(i)) { globo.textContent = orbes[i].titulo; globo.dataset.i = String(i); }
    globo.classList.toggle('visto', resueltos.has(i));
    globo.hidden = false;
    camara.updateMatrixWorld();
    const iconos = orbes.map(radioEnPantalla), yo = iconos[i];
    const obstaculos = iconos.filter((_, j) => j !== i).map((o) => ({ x: o.x - o.r, y: o.y - o.r, w: o.r * 2, h: o.r * 2 }));
    if (popup && !popup.hidden) obstaculos.push({ x: disposicion.x - 8, y: disposicion.y - 8, w: disposicion.w + 16, h: disposicion.h + 16 });
    if (menuLista && !movil) { const m = menuLista.getBoundingClientRect(); obstaculos.push({ x: m.left - 8, y: m.top - 8, w: m.width + 16, h: m.height + 16 }); }
    const l = lineaDos?.getBoundingClientRect();
    if (l?.height) obstaculos.push({ x: l.left - 8, y: l.top - 8, w: l.width + 16, h: l.height + 16 });
    const centro = aPantalla(anillo.centro, disposicion.ancho, disposicion.alto);
    const lugar = lugarDelGlobo(yo, globo.offsetWidth, globo.offsetHeight, centro, obstaculos, { ancho: disposicion.ancho, alto: disposicion.alto });
    globo.style.left = `${Math.round(lugar.x)}px`; globo.style.top = `${Math.round(lugar.y)}px`;
  }
  // Un clic en un ícono abre su reproductor, con la animación de su problema, y suenan las voces de Kai. Cada ícono es un
  // interruptor (nota de voz del titular nmw46tffetit): un segundo clic en el mismo lo cierra y la estación vuelve a como
  // estaba al llegar; uno en otro cierra el que estaba y abre ese
  function alternarProblema(i) {
    if (seleccionado === i) cerrarPopup();
    else abrirProblema(i);
  }
  function abrirProblema(i) {
    const d = problemas[i];
    if (!orbes[i] || !popup || !d || seleccionado === i) return;
    if (seleccionado >= 0) callar();
    marcarVisto(i);
    seleccionado = i;
    autocierre.abrir();
    problemas.forEach((otro, j) => otro.classList.toggle('activo', j === i));
    document.getElementById('popup-respuesta').textContent = d.querySelector('p').textContent;   // para quien lee con un lector de pantalla
    if (disposicion) { camara.updateMatrixWorld(); origenPopup = aPantalla(orbes[i].orbe.position, disposicion.ancho, disposicion.alto); }
    popup.hidden = false;
    // La animación de salida, otra vez desde el ícono nuevo
    popup.classList.remove('sale'); void popup.offsetWidth; popup.classList.add('sale');
    pantalla2.abierta = true;
    ponerReproductor();
    clavesDeClip(i).forEach(audioDe);   // sus voces, pedidas desde ya
    empezarClip();
    if (quieto && ctxClip) { pintarClip(ctxClip, i, duraClip(i)); }
  }
  // Se cierra con Esc, con la rueda fuera de él, con el menú, o solo (4 s después del fin de su animación): sin botón para
  // cerrarlo, porque sus mandos quedan fijos adentro (nmw40cp3jtit). El anillo vuelve a su tamaño y al centro
  cerrarPopup = () => {
    if (seleccionado < 0) return false;
    callar();
    if (seleccionado === GUIA) salirDeComo();
    seleccionado = -1;
    problemas.forEach((d) => d.classList.remove('activo'));
    if (popup) popup.hidden = true;
    pantalla2.abierta = false;
    return true;
  };
  // ── «Cómo empezar» en el reproductor (estación 3; nmw4ircrjtit, nmw4irz3etit): sus mandos son los de los problemas, se abre
  // solo al llegar, una vez por visita, y no se cierra solo al terminar, para que alcance a quedar a la vista el enlace al
  // README; lo cierran Esc, la rueda fuera de él o el menú, y «▶ Ver cómo empezar», en su línea de abajo, lo vuelve a abrir.
  // Debajo de la animación, la fila con un ejemplo de lo que se le puede pedir al modelo, como texto y sin «Copiar»
  // (nmw56hkz8tit: son pedidos tan sencillos que cada quien los escribe a su modo), o el enlace (nmw4f6lictit)
  const extraComo = popup?.querySelector('[data-extra-como]');
  const pedidoComo = extraComo?.querySelector('[data-pedido-como]');
  const enlaceComo = extraComo?.querySelector('[data-enlace-como]'), empezarVoz = popup?.querySelector('[data-empezar-voz]');
  const verComo = document.querySelector('[data-ver-como]');
  const guia = { visita: false, extra: '' };
  function abrirComo() {
    if (!popup) return;
    if (seleccionado === GUIA) return void empezarClip(true);
    if (seleccionado >= 0) cerrarPopup();
    seleccionado = GUIA;
    autocierre.abrir(); autocierre.repetir();   // no se cierra solo
    popup.classList.add('guia');
    popup.setAttribute('aria-label', 'Cómo empezar a usar STL Studio');
    document.getElementById('popup-respuesta').textContent = [...GUION_COMO.escenas, GUION_COMO.cierre].join(' ');
    origenPopup = null;
    popup.hidden = false;
    popup.classList.remove('sale'); void popup.offsetWidth; popup.classList.add('sale');
    pantalla2.abierta = true;
    ponerReproductor();
    clavesDeClip(GUIA).forEach(audioDe);
    empezarClip();
    // Sin un clic antes en la página, el navegador no deja sonar la voz: espera quieta con «▶ Empezar con voz» (nmw4isbmktit)
    // (mientras sus clips esperan la cuota de Google, no hay voz que esperar: empieza con sus rótulos)
    if (conVoz && !quieto && !sinVozTodavia(claveDeComo(0)) && navigator.userActivation && !navigator.userActivation.hasBeenActive) alNoPoderSonar();
    if (quieto && ctxClip) pintarClip(ctxClip, GUIA, duraClip(GUIA));
    pintarExtraComo();
  }
  function alNoPoderSonar() {
    if (seleccionado !== GUIA || !empezarVoz) return;
    callar();
    clipT = 0; pausado = true; pintarMando();
    empezarVoz.hidden = false;
  }
  empezarVoz?.addEventListener('click', () => { empezarVoz.hidden = true; if (seleccionado === GUIA) empezarClip(); });
  function salirDeComo() {
    popup?.classList.remove('guia');
    popup?.setAttribute('aria-label', 'Cómo lo resuelve STL');
    if (empezarVoz) empezarVoz.hidden = true;
    guia.extra = '';
  }
  // Lo de la fila de abajo, según la escena que se ve: el ejemplo de su escena, o el enlace al README desde la última
  // escena hasta el final
  function pintarExtraComo() {
    if (!extraComo || seleccionado !== GUIA) return;
    const { k } = escenaDeComo(clipT), pedido = PEDIDOS_COMO[k] ?? '', enlace = k >= GUION_COMO.escenas.length - 1;
    const cual = pedido || (enlace ? 'enlace' : '');
    if (cual === guia.extra) return;
    guia.extra = cual;
    if (pedidoComo) { pedidoComo.textContent = pedido ? `Por ejemplo: «${pedido}»` : ''; pedidoComo.hidden = !pedido; }
    if (enlaceComo) enlaceComo.hidden = !enlace;
  }
  verComo?.addEventListener('click', () => { guia.visita = true; abrirComo(); });
  // Un clic en el nombre de un problema de la lista lo abre en el mundo (sin 3D, se abre ahí mismo con su respuesta)
  problemas.forEach((d, i) => d.querySelector('summary')?.addEventListener('click', (e) => { e.preventDefault(); alternarProblema(i); }));
  // Su globo, mientras el ratón está sobre su ícono o sobre el problema en la lista
  function mostrarNombre(i) { sobre = i; }
  problemas.forEach((d, i) => {
    d.addEventListener('mouseenter', () => mostrarNombre(i));
    d.addEventListener('mouseleave', () => { if (sobre === i) mostrarNombre(-1); });
  });
  // Y un clic en su ícono, en el mundo
  const rayo = new THREE.Raycaster(), puntero = new THREE.Vector2();
  const tocables = orbes.map((o) => o.hit);   // su área invisible: una esfera alrededor del ícono
  function bajoElPuntero(e) {
    if (cur < 1.5 || cur > 2.6 || visorAbierto()) return -1;
    const r = lienzo.getBoundingClientRect();
    puntero.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    rayo.setFromCamera(puntero, camara);
    return rayo.intersectObjects(tocables, false)[0]?.object.userData.i ?? -1;
  }
  lienzo.addEventListener('click', (e) => { const i = bajoElPuntero(e); if (i >= 0) alternarProblema(i); });
  lienzo.addEventListener('pointermove', (e) => {
    const i = bajoElPuntero(e);
    lienzo.style.cursor = i >= 0 ? 'pointer' : '';
    if (i !== sobre) mostrarNombre(i);
  });
  lienzo.addEventListener('pointerleave', () => mostrarNombre(-1));

  // ── El bucle: solo dibuja mientras el recorrido está a la vista
  let enVista = false, cur = 0, primera = true, ultimoCuadro = performance.now(), ultimaRueda = 0;
  addEventListener('wheel', () => { ultimaRueda = performance.now(); }, { passive: true });
  new IntersectionObserver(([e]) => { enVista = e.isIntersecting; if (enVista) requestAnimationFrame(cuadro); }, { rootMargin: '200px' })
    .observe(document.getElementById('viaje'));
  let dibujados = 0;
  function cuadro() {
    if (!enVista) return;
    // En ?ver=N, unos segundos de cuadros y se queda quieta: así se puede capturar sin pantalla
    if (fijo !== null && !enVideo && ++dibujados > 150) return;
    const w = objetivo();
    cur = quieto ? Math.round(w) : primera ? w : cur + (w - cur) * SUAVIZADO;
    primera = false;
    // Si la persona se va de la estación 2 (o de la 3, con «Cómo empezar») con un reproductor abierto (por la barra de
    // scroll, el teclado…), se cierra
    if (seleccionado >= 0 && Math.abs(cur - (seleccionado === GUIA ? 3 : 2)) > 0.45) cerrarPopup();
    const ahoraMs = performance.now(), dt = Math.min(0.1, (ahoraMs - ultimoCuadro) / 1000);
    // «Cómo empezar» se abre solo al llegar a la estación 3, cuando la cámara ya se detuvo y la rueda lleva un momento quieta
    // (si no, la misma rueda que trae hasta aquí lo cerraría); una vez por visita
    if (Math.abs(cur - 3) > 0.45) guia.visita = false;
    else if (!guia.visita && Math.abs(w - 3) < 0.02 && Math.abs(cur - 3) < 0.06 && ahoraMs - ultimaRueda > 700 && seleccionado < 0 && !visorAbierto()) { guia.visita = true; abrirComo(); }
    pintarExtraComo();
    if (verComo) verComo.hidden = seleccionado === GUIA;
    ultimoCuadro = ahoraMs;
    // El reproductor se abre o se cierra suave: el anillo se achica y se corre hacia el menú, o vuelve
    const meta = pantalla2.abierta ? 1 : 0;
    pantalla2.cam = quieto ? meta : pantalla2.cam + (meta - pantalla2.cam) * Math.min(1, dt * 4);
    if (quieto) anillo.mover?.(0);
    colocar(cur);
    marcar(cur);
    if (!quieto) {
      const t = ahoraMs / 1000;
      animar.forEach((f) => f(t));
      if (seleccionado >= 0 && ctxClip) {
        avanzarClip();
        // Termina su animación, y 4 s después el reproductor se cierra solo (salvo que se haya repetido)
        if (autocierre.cuadro(ahoraMs, terminado())) cerrarPopup();
      }
    }
    ponerReproductor();
    ponerGlobo();
    renderer.render(escena, camara);
    requestAnimationFrame(cuadro);
  }
  // Se vuelve a medir cada vez que cambia el tamaño del lienzo o de la página (también si al cargar aún no tenía ancho)
  new ResizeObserver(medir).observe(lienzo);
  new ResizeObserver(medir).observe(document.body);
  addEventListener('load', medir);
  medir();
  // Con un enlace a una estación (#e-te-ha-pasado), se llega a donde la cámara se detiene
  const pedida = estaciones.findIndex((el) => `#${el.id}` === location.hash);
  if (pedida >= 0 && fijo === null) addEventListener('load', () => { medir(); scrollTo({ top: anclas[pedida + 1] }); });
  // Las animaciones de las estaciones esperan quietas hasta «Empieza el recorrido», que las echa a andar todas
  // (nmw1khrketit); con un enlace a una estación, la suya empieza sola, y con ?ver=N, todas, para capturarlas
  document.querySelector('.entrada .bajar')?.addEventListener('click', () => relojes.forEach((_, k) => empezarEstacion(k)));
  if (fijo !== null) relojes.forEach((_, k) => empezarEstacion(k));
  else if (pedida >= 0) empezarEstacion(pedida);
  // ?ver=2&abrir=N&seg=S: para capturar la pantalla del problema N (desde 0) ya abierta, quieta en el segundo S de su animación
  const abrirN = new URLSearchParams(location.search).get('abrir');
  if (fijo !== null && abrirN !== null && problemas[Number(abrirN)]) {
    abrirProblema(Number(abrirN));
    pantalla2.cam = 1;
    clipT = Number(new URLSearchParams(location.search).get('seg')) || 0; pausado = true;
    pintarClip(ctxClip, Number(abrirN), clipT);
  }
  // Todo en su lugar desde el primer cuadro (con movimiento reducido, nada más se mueve)
  animar.forEach((f) => f(0));
  colocar(0);
  renderer.render(escena, camara);
}

// Al final, con todo lo de arriba ya definido: las constantes de las mini animaciones (suave, TINTAS…) aún no existían
// si el mundo arrancaba antes, y la página se quedaba sin 3D
if (lienzo && estaciones.length && hayWebGL()) {
  document.documentElement.classList.add('js-3d');
  if (fijo !== null) document.documentElement.classList.add('ver-parada');
  if (compartir) document.documentElement.classList.add('compartir');
  iniciar();
}
if (enVideo) import('./video-corto.js').then((m) => m.montar({ grandes: GRANDES, pintarClip, duraClip, tramoDeVoz, gancho: ganchoVideo, sinCuenta: () => { sinCuenta = true; } }));
