// El recorrido en 3D de «Qué es STL», su primer tramo (pd_recorrido_3d, 3 de noviembre de 2026): la estación 1 («Qué es
// STL»: tres actores, el desarrollador en la línea, y el Studio (con el director dentro) y el modelo en alto, con el ciclo
// de lo que le entregas y las misiones que pasan), la línea
// del tiempo como camino hasta la estación 2 y la estación 2 («¿Te ha pasado…?»: los seis grandes problemas giran
// despacio alrededor de la línea, como un anillo, cada uno un ícono 3D con su globo al pasar el ratón; al elegir uno, su
// reproductor crece a la izquierda del anillo, hasta donde deja la pantalla, con sus mandos adentro, y se cierra solo 4 s
// después de terminar). «Cómo funciona» y «Lo que ya trae» salieron del recorrido: repetían lo que ya cuentan la estación
// 1 y las soluciones de la 2 (notas de voz nmw3xje22tit, nmw40cp3jtit y nmw40fizktit). Lo aprendido, en la skill
// «sitio-3d-scroll»: un escenario fijo detrás, el scroll convertido en el avance de la cámara y suavizado en cada cuadro, y
// el texto siempre en HTML. Con lo que pidió el titular al verlo, en dos vueltas: sin fragmentos ni postes (y, desde las
// decisiones nmw5erxrytit, nmw5es4cgtit, nmw5es6twtit, nmw5gvj21tit, nmw5iur8itit y nmw5mkt58tit, un cielo de estrellas
// lejanas en tres capas en lugar del suelo, con semilla fija, y una de cada diez que titila despacio), la
// cámara más lenta, el camino solo con la línea (sin las esferas de colores, nmw76cwtctit) y la animación de la estación 1 en
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
  es: { descargalo: 'Descárgalo', tuCarpeta: 'Tu carpeta', pideAgente: 'Pídeselo a tu agente', dev: 'Desarrollador',estudio: 'Estudio', director: 'Director', modelo: 'Modelo', mision: 'Misión', falla: 'Error', idea: 'Idea', ajuste: 'Ajuste', pregunta: 'Petición', respuesta: 'Comentario', pasado: 'Problemas de desarrollar por chat que STL resuelve muy bien', uno: 'Qué es STL', tres: 'Cómo empezar', visor: '¿Qué es STL?: <span>El guardrail donde más hacía falta, en el Dev</span>' },
  en: { descargalo: 'Download it', tuCarpeta: 'Your folder', pideAgente: 'Ask your agent', dev: 'Dev',estudio: 'Studio', director: 'Director', modelo: 'Model', mision: 'Mission', falla: 'Bug', idea: 'Idea', ajuste: 'Tweak', pregunta: 'Request', respuesta: 'Comment', pasado: 'Problems of developing through chat that STL solves really well', uno: 'What is STL', tres: 'Getting started', visor: 'What is STL?: <span>The guardrail where it was needed most, in Dev</span>' },
};
const T = TEXTOS[(document.documentElement.lang || 'es').toLowerCase().startsWith('en') ? 'en' : 'es'];
const EN = (document.documentElement.lang || 'es').toLowerCase().startsWith('en');
// El título corto de cada gran problema, el que sale en el globo de su ícono: dos palabras (nota de voz nmw40cp3jtit); en
// español, el data-corto de la página; en inglés, su equivalente natural
const TITULOS_CORTOS_EN = ['Scattered attention', 'Incomplete messages', 'Lost thread', 'Long answers', 'Forgetful model', 'No internet', 'Typing fatigue'];
// La línea de la estación 2 sale del diccionario, también en la página en inglés
const tituloDos = document.querySelector('[data-titulo-dos]');
if (tituloDos) tituloDos.textContent = T.pasado;
// Las tarjetas de las estaciones 1 y 3, también en inglés: solo su botón, que dice el nombre de la estación, sin un rótulo
// encima (nota de voz del titular nmw6p0g7htit; antes, un título y «▶ Ver la animación», nmw5o26vdtit)
for (const [marca, texto] of [['[data-titulo-tres]', T.tres], ['[data-texto-ver]', T.uno], ['[data-ver-como]', T.tres]]) {
  const el = document.querySelector(marca);
  if (el) el.textContent = texto;
}
// Lo fijo de la página que no tiene su propio gancho, en inglés, por su texto en español (nmw766nyutit)
const FIJO_EN = {
  '¿Qué es STL? · El recorrido': 'What is STL? · The tour',
  'Siguiente problema ›': 'Next problem ›',
  'Cerrar': 'Close',
  '¿Qué es STL? Un recorrido en 3D por la línea del tiempo de un proyecto: STL Studio, la interfaz entre tú y el modelo, y los problemas de trabajar con IA por chat que resuelve.':
    'What is STL? A 3D tour along a project’s timeline: STL Studio, the interface between you and the model, and the problems of working with AI through chat that it solves.',
  '¿Qué es STL?': 'What is STL?',
  'Tu teléfono es demasiado lento para este recorrido': 'Your phone is too slow for this tour',
  'Te invitamos a verlo en un computador o en un teléfono más rápido.': 'We invite you to see it on a computer or on a faster phone.',
  'Las estaciones y el idioma': 'The stations and the language',
  '▶ Bájalo en GitHub': '▶ Get it on GitHub',
  'STL Studio, creado por ARGWABOT (A Regular Guy With A Bunch Of Tokens).': 'STL Studio, created by ARGWABOT (A Regular Guy With A Bunch Of Tokens).',
  'La animación de la línea del proyecto, en grande': 'The project line animation, large',
  '← Volver al recorrido': '← Back to the tour',
  'Volver al recorrido': 'Back to the tour',
  'Esc también vuelve': 'Esc also goes back',
  'Cómo lo resuelve STL': 'How STL solves it',
  'La voz que lee cada rótulo: oprímelo para callarla o para volver a oírla': 'The voice that reads each label: press it to mute it or to hear it again',
  'Repetir la animación; el reproductor se queda abierto': 'Replay the animation; the player stays open',
  '↻ Repetir': '↻ Replay',
  'Velocidad de la voz y de la animación': 'Speed of the voice and the animation',
  'segundo 0': 'second 0',
  'Perilla de la animación: con la rueda del ratón, o girándola, la adelantas o la devuelves; con las flechas, de a un segundo':
    'Animation knob: with the mouse wheel, or by turning it, you move it forward or back; with the arrow keys, one second at a time',
  'Pausar la animación': 'Pause the animation',
  '🔊 Voz': '🔊 Voice',
};
// «La documentación», la última estación, en inglés (pd_pagina_unica, pd_bilingue): sus pestañas cortas (nmw76dxyhtit), los
// tres pasos del README.md con la guía INSTALL.md (nmw73ypystit, nmw6ze91ltit), el glosario con los textos del «?» de la
// interfaz en inglés (estudio/src/textos/en.ts › palabra.*, en el orden del ciclo: nmw72c311tit, nmw3s4h3dtit), cada palabra
// con su enlace a su parte del método (nmw76eqautit), y solo los títulos de las seis partes, con su enlace a la metodología
// en inglés (nmw76ej5vtit, nmw728gogtit). La página en español los trae escritos en mundo-3d.html
const REPO = 'https://github.com/ARGWABOT/STL-Sacred_Time_Line';
const METODO_EN = `${REPO}/blob/main/docs/metodo/metodologia.md`;
const PARTES_EN = [['#1-what-it-is-and-the-problem-it-solves', 'What it is and the problem it solves'], ['#2-the-cycle-of-a-review', 'The cycle of a review'],
  ['#3-the-roadmap', 'The roadmap'], ['#4-what-the-director-can-and-cannot-do', 'What the director can and cannot do'],
  ['#5-the-memory-in-your-repository', 'The memory in your repository'], ['#6-when-not-to-use-it', 'When not to use it']];
const DOC_EN = {
  titulo: 'Documentation', boton: '▶ Documentation', pestanas: ['Install', 'Glossary', 'Method'], partes: 'The parts of the documentation',
  pasos: [`<strong>Download STL Studio</strong> (<a href="${REPO}/releases/latest" target="_blank" rel="noopener">the latest version</a>), unzip it and open Claude Code in its folder.`,
    '<strong>Ask it «initialize STL Studio»</strong>: it installs everything and opens the Studio in your browser.',
    '<strong>Hand over your project</strong> with «Hand over projects»: the director diagnoses it and gives you your first mission.'],
  enlaces: [[`${REPO}/blob/main/INSTALL.md`, 'The full installation guide (INSTALL.md) ↗'], [`${REPO}#readme`, 'The README on GitHub ↗']],
  // [la palabra, su frase, su parte del método (1 a 6)]
  glosario: [['Mission', 'the only thing you have to do now, with its steps and a button to each place; the others wait their turn.', 3],
    ['Review', 'when you ask for it, the director gets everything together, answers each note and leaves you your next mission.', 2],
    ['Inbox', 'where your notes, ideas and adjustments wait, and you can edit them, until you ask for the review.', 2],
    ['Director', 'the model that works for you inside the Studio: it sorts what you say, proposes and gives you one mission at a time; you decide.', 4],
    ['Memory', 'the project files where everything you decided stays, so nobody has to ask you again.', 5],
    ['Scattering', 'what happens when you open many sessions at once and lose the thread; STL exists to avoid it.', 1],
    ['Roadmap', 'the path of the project to its goal, split into phases.', 3],
    ['Phase', 'a stretch of the roadmap with a single purpose, for example «Understood at a glance».', 3],
    ['Gate', 'what has to happen to change phase; you cross it, when its criteria are met.', 3],
    ['Proposal', 'an idea from the director with its why and its risks, which you accept or discard.', 2],
    ['Request', 'what you asked for in a note, kept in its phase until it is done.', 2],
    ['Timeline', 'the history of the project as a line: what already happened, where you are and what comes next.', 5]],
};
const enlaceDoc = (href, texto) => `<a href="${href}" target="_blank" rel="noopener">${texto}</a>`;
if (EN) {
  const doc = document.querySelector('[data-documentacion]');
  if (doc) {
    doc.querySelector('.doc-titulo').textContent = DOC_EN.titulo;
    doc.querySelector('[role="tablist"]')?.setAttribute('aria-label', DOC_EN.partes);
    doc.querySelectorAll('[role="tab"]').forEach((b, i) => { b.textContent = DOC_EN.pestanas[i]; });
    doc.querySelector('.doc-pasos').innerHTML = DOC_EN.pasos.map((p) => `<li>${p}</li>`).join('');
    doc.querySelector('.doc-enlaces').innerHTML = DOC_EN.enlaces.map(([href, texto]) => enlaceDoc(href, texto)).join(' ');
    doc.querySelector('.doc-glosario').innerHTML = DOC_EN.glosario.map(([palabra, frase, parte]) => `<dt>${enlaceDoc(METODO_EN + PARTES_EN[parte - 1][0], palabra)}</dt><dd>${frase}</dd>`).join('');
    doc.querySelector('.doc-metodo').innerHTML = PARTES_EN.map(([ancla, titulo]) => `<li>${enlaceDoc(METODO_EN + ancla, titulo)}</li>`).join('');
  }
  const tituloDoc = document.querySelector('[data-titulo-doc]'), verDoc = document.querySelector('[data-ver-doc]');
  if (tituloDoc) tituloDoc.textContent = DOC_EN.titulo;
  if (verDoc) verDoc.textContent = DOC_EN.boton;
}
// Sus pestañas: un clic o las flechas cambian de parte; abre siempre en la de instalar (nmw74xul6tit)
const pestanasDoc = [...document.querySelectorAll('[data-documentacion] [role="tab"]')];
function elegirPestana(k) {
  pestanasDoc.forEach((b, i) => {
    const esta = i === k;
    b.setAttribute('aria-selected', String(esta));
    b.tabIndex = esta ? 0 : -1;
    const panel = document.getElementById(b.getAttribute('aria-controls'));
    if (panel) panel.hidden = !esta;
  });
}
pestanasDoc.forEach((b, i) => {
  b.addEventListener('click', () => elegirPestana(i));
  b.addEventListener('keydown', (e) => {
    const paso = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!paso) return;
    const k = (i + paso + pestanasDoc.length) % pestanasDoc.length;
    elegirPestana(k);
    pestanasDoc[k].focus();
  });
});
// Su «▶» abre la tarjeta de texto en la pestaña de instalar, y otro clic la cierra; al dejar la estación se va sola (CSS)
const tarjetaDoc = document.querySelector('[data-documentacion]'), botonDoc = document.querySelector('[data-ver-doc]');
botonDoc?.addEventListener('click', () => {
  const abre = !tarjetaDoc?.classList.contains('abierta');
  if (abre) elegirPestana(0);
  tarjetaDoc?.classList.toggle('abierta', abre);
  botonDoc.setAttribute('aria-expanded', String(abre));
});
// Lo fijo de «Cómo empezar» en la página, también en inglés (nmw6r9827tit): «▶ Empezar con voz», el enlace a la
// documentación y, sin 3D, sus siete pasos
if (EN) {
  const empezar = document.querySelector('[data-empezar-voz]');
  if (empezar) empezar.textContent = '▶ Start with voice';
  const enlace = document.querySelector('[data-enlace-como]');
  if (enlace) enlace.textContent = 'Open the documentation (the README on GitHub) ↗';
  const pasos = ['Want to try the Studio now? This is how you start.', 'First, bring it to your computer: clone the repository, or download it from GitHub.', 'Put it in the folder where you want to work.', 'For your peace of mind, first ask your model for a security scan: to confirm it brings nothing malicious. For example, in Claude Code: «Review this repository and tell me whether it brings anything malicious before installing it»', 'Then ask it to install it. For example, in Claude Code: «Initialize STL Studio»', 'From there, the Studio guides you step by step.', 'If you have any doubt, read the documentation.'];
  const lista = document.querySelectorAll('ol.lista-como li');
  lista.forEach((li, k) => { if (pasos[k]) li.textContent = pasos[k]; });
  const ultimo = lista[6];
  if (ultimo) { const a = document.createElement('a'); a.href = 'https://github.com/ARGWABOT/STL-Sacred_Time_Line#readme'; a.textContent = 'the documentation'; ultimo.textContent = 'If you have any doubt, read '; ultimo.append(a, '.'); }
  const listo = document.querySelector('p.lista-como');
  if (listo) listo.textContent = 'Done: you are up and running.';
  // La estación 2, «Has this happened to you?», en inglés (nmw738o1ktit): el enunciado de cada problema, que también abre
  // su animación, y su respuesta de la lista sin 3D, fieles al español (nmw3q7lw7tit)
  const PROBLEMAS_EN = [
    ['Do you open 4 or more sessions at once, struggle to know where each one is and, when an idea comes up in the middle of something, put it in any of them and end up not knowing what comes next?', 'With STL everything comes in through a single channel: ideas and tweaks go to the Inbox and to their phase on the route, you don’t overload your attention and you always know what comes next.'],
    ['Do you send a message to the model and realize, 3 seconds later, that you left something out or got something wrong?', 'Your note waits in the Inbox and you can edit it; what you decided stays settled, and every change of decision is properly documented.'],
    ['Do you come back from a break not knowing where you were or what’s next, and in every new session explain everything to the model again?', 'With STL, «Where we left off» is waiting for you with a single mission in view, and the director already knows it all: you pick up without repeating anything.'],
    ['Do long answers tire you out, do you lose track of what you already read, and does the model ask you to reread documentation you already reviewed?', 'You read one idea at a time, with «Got it»; what you already read stays marked and sealed, and what is new arrives in a short document.'],
    ['Do your tokens go on sessions that reread the same things, does your context get polluted every time you change a decision, and you don’t know what the model remembers?', 'With STL the director reads only what changed, what you replaced leaves the context, and you see each step between the director and the model.'],
    ['Did your internet go down and your work with AI stopped?', 'With STL Studio you keep working offline: the Inbox collects your notes, tweaks and deliveries, and you keep reading your documents and answers and auditing the model’s work. Nothing is lost, and when the connection comes back the director receives it all together.'],
    ['Does writing down everything you think tire you, and your messages to the model come out half-done?', 'With STL you dictate your notes: you talk as you would with a friend, naturally, and you can even ramble, since the director will understand you; they are transcribed on your computer and, since they go to the Inbox and not straight to the model, you read and correct them before they arrive.'],
  ];
  document.querySelectorAll('details.problema').forEach((d, i) => {
    const [enunciado, respuesta] = PROBLEMAS_EN[i] ?? [];
    const s = d.querySelector('summary'), r = d.querySelector('p');
    if (s && enunciado) s.textContent = enunciado;
    if (r && respuesta) r.textContent = respuesta;
  });
  document.getElementById('popup-clip')?.setAttribute('aria-label', 'An animation of this problem: each situation as it happens when working with AI by chat, followed by how STL solves it, step by step');
  // Lo demás que está fijo en la página, en inglés (nota del titular nmw766nyutit: con «EN» no queda nada en español): la
  // cubierta del teléfono, el final del tramo, el visor con «← Back to the tour», los mandos del reproductor y sus
  // etiquetas para lectores de pantalla. Por su texto en español: cada texto y cada aria-label, title o aria-valuetext
  // que coincide se cambia (tools/recorrido3d.test.ts comprueba que no quede ninguno sin su inglés)
  document.title = FIJO_EN[document.title] ?? document.title;
  const descripcion = document.querySelector('meta[name="description"]');
  if (descripcion) descripcion.setAttribute('content', FIJO_EN[descripcion.getAttribute('content')] ?? descripcion.getAttribute('content'));
  const recorre = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = recorre.nextNode(); n; n = recorre.nextNode()) {
    const clave = n.nodeValue.trim();
    if (clave && Object.hasOwn(FIJO_EN, clave)) n.nodeValue = n.nodeValue.replace(clave, FIJO_EN[clave]);
  }
  for (const el of document.querySelectorAll('[aria-label], [title], [aria-valuetext]')) {
    for (const atributo of ['aria-label', 'title', 'aria-valuetext']) {
      const valor = el.getAttribute(atributo);
      if (valor && Object.hasOwn(FIJO_EN, valor)) el.setAttribute(atributo, FIJO_EN[valor]);
    }
  }
}
// El menú, la entrada y «ES · EN» en el idioma de la página (pd_bilingue; los nombres en inglés, t_decide_nombres_en y
// t_decide_nombre_como_empezar_en). El otro idioma recarga la página con su ?lang, y la elección se guarda (nmw2lz2bvtit)
const IDIOMA_GUARDADO = 'stl-idioma';
const PAGINA = {
  es: { menu: ['Qué es STL', '¿Te ha pasado…?', 'Cómo empezar', 'La documentación'], h1: '¿Qué es STL?', bajar: 'Empieza el recorrido', saltar: 'Saltar el recorrido', nav: 'Las estaciones de «Qué es STL»' },
  en: { menu: ['What is STL', 'Has this happened to you?', 'Getting started', 'Documentation'], h1: 'What is STL?', bajar: 'Start the tour', saltar: 'Skip the tour', nav: 'The stations of «What is STL»' },
}[EN ? 'en' : 'es'];
document.querySelectorAll('.menu ol > li > :is(a, span)').forEach((el, i) => { if (PAGINA.menu[i]) el.textContent = PAGINA.menu[i]; });
document.querySelector('.menu')?.setAttribute('aria-label', PAGINA.nav);
const h1Entrada = document.querySelector('.entrada h1');
if (h1Entrada) h1Entrada.textContent = PAGINA.h1;
const bajarTexto = document.querySelector('.bajar')?.firstChild;
if (bajarTexto?.nodeType === 3) bajarTexto.textContent = `${PAGINA.bajar} `;
const saltar = document.querySelector('.saltar');
if (saltar) saltar.textContent = PAGINA.saltar;
for (const b of document.querySelectorAll('[data-idioma]')) {
  b.setAttribute('aria-pressed', String(b.dataset.idioma === (EN ? 'en' : 'es')));
  b.addEventListener('click', () => {
    const idioma = b.dataset.idioma;
    try { localStorage.setItem(IDIOMA_GUARDADO, idioma); } catch { /* sin almacenamiento: vale el enlace */ }
    const url = new URL(location.href);
    url.searchParams.set('lang', idioma);
    location.href = url.href;
  });
}
// Y el título de la animación de la estación 1, arriba a la derecha de su visor (nmw479zmetit)
const tituloVisor = document.querySelector('[data-titulo-visor]');
if (tituloVisor) tituloVisor.innerHTML = T.visor;
// Cuánto de la distancia que le falta recorre la cámara en cada cuadro. Fue 0,085, luego 0,03 y ahora la mitad, 0,015: el
// cambio entre estaciones mareaba (nota de voz nmw17rx07tit)
//
// Entre estaciones vecinas la cámara va a la MITAD de esa velocidad otra vez (0,0075: el doble de tiempo), para disfrutar el fondo y los
// elementos (nmw5o26vdtit); un salto de dos estaciones o más (un clic lejano en el menú) sigue con la de antes, más rápida
const SUAVIZADO = 0.0075, SUAVIZADO_SALTO = 0.015;
const suavizadoPara = (distancia) => (Math.abs(distancia) > 1.5 ? SUAVIZADO_SALTO : SUAVIZADO);
// «Empieza el recorrido» llega a la estación 1 en la mitad del tiempo de un paso entre estaciones vecinas: el doble de lo
// que recorre la cámara en cada cuadro (nota de voz del titular nmw6xuro1tit, 7 de noviembre de 2026: «reduce ese tiempo a
// la mitad»). Solo en ese viaje: lo apaga la llegada o la rueda del ratón
const SUAVIZADO_ARRANQUE = SUAVIZADO * 2;
// Lo que flota junto a la línea nunca queda detrás del menú flotante (nota de voz del titular nmw6z8b3btit, con su captura):
// si su caja en la pantalla cruza la del menú (con su aire), se corre a la izquierda, a su misma altura, hasta quedar justo
// sobre la línea amarilla (nota de voz del titular nmw7160d0tit: «más cerca de la línea, alineadas sobre ella, y más lejos de
// arriba»); si ahí pisa otra cosa (`evitar`, como la pantalla de la estación), se corre solo lo justo para salir del menú; si
// tampoco cabe, sube al espacio libre que queda sobre el menú, y si arriba no cabe, baja al que queda debajo, y si tampoco,
// sube lo que puede y se corre a la izquierda del menú. Nunca sale de la pantalla. Pura: recibe la caja ({ x, y, w, h }, en
// píxeles), la del menú, el tamaño de la pantalla, cuánto correrla para quedar sobre la línea (`sobreLinea`, o null) y las
// cajas que no debe pisar, y devuelve cuánto correrla ({ dx, dy })
const AIRE_MENU = 16;
function apartarDelMenu(caja, menu, ancho, alto, sobreLinea = null, evitar = []) {
  if (!caja || !menu || !menu.w || !menu.h || !ancho || !alto) return { dx: 0, dy: 0 };
  const cruza = (dx, dy) => caja.x + dx < menu.x + menu.w + AIRE_MENU && menu.x - AIRE_MENU < caja.x + caja.w + dx
    && caja.y + dy < menu.y + menu.h + AIRE_MENU && menu.y - AIRE_MENU < caja.y + caja.h + dy;
  if (!cruza(0, 0)) return { dx: 0, dy: 0 };
  const pisa = (dx) => evitar.some((o) => o && caja.x + dx < o.x + o.w + AIRE_MENU && o.x - AIRE_MENU < caja.x + caja.w + dx
    && caja.y < o.y + o.h + AIRE_MENU && o.y - AIRE_MENU < caja.y + caja.h);
  const sirve = (dx) => dx < 0 && caja.x + dx >= AIRE_MENU && !cruza(dx, 0) && !pisa(dx);
  // A su altura, sobre la línea; si no, a su altura, lo justo para salir del menú
  if (Number.isFinite(sobreLinea) && sirve(sobreLinea)) return { dx: sobreLinea, dy: 0 };
  const aLaIzquierda = menu.x - AIRE_MENU - (caja.x + caja.w);
  if (sirve(aLaIzquierda)) return { dx: aLaIzquierda, dy: 0 };
  const subir = menu.y - AIRE_MENU - (caja.y + caja.h), bajar = menu.y + menu.h + AIRE_MENU - caja.y;
  // Arriba primero, como lo marcó el titular; si arriba no cabe, debajo del menú
  if (caja.y + subir >= AIRE_MENU) return { dx: 0, dy: subir };
  if (caja.y + caja.h + bajar <= alto - AIRE_MENU) return { dx: 0, dy: bajar };
  const dy = Math.min(0, AIRE_MENU - caja.y);
  const dx = Math.max(AIRE_MENU - caja.x, menu.x - AIRE_MENU - (caja.x + caja.w));
  return { dx: Math.min(0, dx), dy };
}
// La cámara siempre mira hacia adelante o hacia atrás por la línea, nunca hacia el piso: lo que mira nunca queda más abajo que
// ella (nmw5o26vdtit). Pura: recibe la posición y el punto que mira, y devuelve el punto corregido
const sinMirarAbajo = (posicion, mira) => ({ x: mira.x, y: Math.max(mira.y, posicion.y), z: mira.z });
// Y el encuadre tampoco la baja: correr la imagen hacia arriba (setViewOffset con un corrimiento vertical positivo) se ve
// igual que mirar al piso. El corrimiento vertical solo puede subir la mirada, nunca bajarla (nmw6lcanstit)
const corrimientoSinBajar = (y) => Math.min(0, y);
// La altura de la cámara sobre la línea, y la del centro del anillo de la estación 2, a la par (nmw6lcanstit)
const ALTURA_CAMARA = 2.8;

// ── Un teléfono abre el recorrido directo, sin aviso (nmw7y7d0ktit). Solo el que no puede con él queda cubierto: sin WebGL,
// o con menos de FPS_MINIMO cuadros por segundo en sus primeros segundos. El aviso invita a verlo en un computador o en un
// teléfono más rápido, sin versión simple ni botón para pasar (nmw7yb1bttit); el mundo deja de dibujarse. ?lento lo muestra
// a propósito, para revisarlo
const FPS_MINIMO = 20, MS_MEDIR_FPS = 3000;
let cubierto = false;
function cubrirLento() {
  cubierto = true;
  document.getElementById('cubierta-movil')?.classList.add('lenta');
  document.documentElement.classList.add('cubierta-lenta');
}
// El menú en un teléfono: un solo botón que despliega las estaciones y «ES · EN» (nmw7yg7m2tit); elegir una estación, tocar
// fuera o el botón otra vez lo pliega
const menuNav = document.querySelector('.menu'), menuBoton = document.querySelector('[data-menu-boton]');
function plegarMenu(abrir = false) {
  menuNav?.classList.toggle('abierto', abrir);
  menuBoton?.setAttribute('aria-expanded', String(abrir));
}
menuBoton?.addEventListener('click', () => plegarMenu(!menuNav.classList.contains('abierto')));
document.querySelectorAll('.menu ol a').forEach((a) => a.addEventListener('click', () => plegarMenu(false)));
document.addEventListener('pointerdown', (e) => { if (menuNav?.classList.contains('abierto') && !menuNav.contains(e.target)) plegarMenu(false); });

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
// Con decimales (?ver=3.4), la cámara queda fija entre dos estaciones: para revisar un tramo cuadro a cuadro (nmw84v293tit)
const fijo = compartir ? 0 : enVideo ? 1 : verTexto === null ? null
  : Math.max(0, Math.min(estaciones.length, verTexto.includes('.') ? Number(verTexto) || 0 : Math.round(Number(verTexto)) || 0));

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
  // En el idioma del recorrido: con «EN», «What is STL» se lee en inglés (pd_bilingue, nmw6z8wj2tit)
  if (!visorIframe.getAttribute('src')) visorIframe.setAttribute('src', `${visorIframe.dataset.src}?lang=${EN ? 'en' : 'es'}`);
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
// Los colores de cada tipo de nota, los mismos del Studio (estudio/src/estilos.css › --lv-respuesta, --lv-ajuste…): lo que le entregas al Studio en la estación 1 y los íconos 2D de las animaciones los llevan (nota
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
// El idioma de lo que se dibuja, sin depender de la página (las pruebas lo dibujan sin documento)
const EN_DIBUJO = typeof document !== 'undefined' && (document.documentElement?.lang || 'es').toLowerCase().startsWith('en');
// Las palabras dibujadas dentro de las escenas de «¿Te ha pasado…?», en inglés (t_decide_estacion2_textos, nmw738o1ktit: los
// tres tipos de texto de la estación 2, también lo que va escrito en cada escena). letrero y globo las cambian al dibujar;
// lo que no está aquí (un nombre, un número, «STL») se dibuja tal cual
const DIBUJO_EN = {
  "tú": "you",
  "Buzón del Studio": "Studio's Inbox",
  "el director": "the director",
  "el modelo": "the model",
  "el Studio": "the Studio",
  "el Buzón": "the Inbox",
  "la corriges": "you fix it",
  "te faltó algo": "something missing",
  "Entendido": "Got it",
  "tu misión": "your mission",
  "el plan": "the plan",
  "el mapa": "the map",
  "lo que dijiste": "what you said",
  "estado guardado: no repites nada": "state saved: you repeat nothing",
  "el chat con el modelo": "the chat with the model",
  "Hazme el inicio de sesión": "Build me the login",
  "Escribiendo…": "Typing…",
  "…y que entre con Google": "…and Google sign-in",
  "otro mensaje, y otro, para corregir": "message after message to correct it",
  "sesión": "session",
  "¿en qué iba?": "where was I?",
  "el Studio: un solo canal": "the Studio: a single channel",
  "Tu misión de ahora": "Your current mission",
  "un proyecto · una misión": "one project · one mission",
  "lo que ibas a hacer": "what you were going to do",
  "y lo otro se quedó a medias": "and the rest was left half-done",
  "fase 1": "phase 1",
  "fase 2": "phase 2",
  "fase 3": "phase 3",
  "la respuesta del modelo": "the model's answer",
  "tu atención": "your focus",
  "y le dices «sí» a todo": "and you say «yes» to everything",
  "en voz alta": "aloud",
  "✉": "✉",
  "comenta aquí": "comment here",
  "el documento": "the document",
  "Parte 2": "Part 2",
  "leída": "read",
  "¿esto ya lo leí?": "did I read this already?",
  "lo que ya leíste": "what you already read",
  "el documento que ya leíste": "the document you already read",
  "sellado": "sealed",
  "le cambiaron algo": "something was changed",
  "léelo otra vez entero": "read it all again",
  "lo nuevo": "what's new",
  "solo lo que cambió": "only what changed",
  "Usemos la opción A": "Let's use option A",
  "¿Usamos A o B?": "Should we use A or B?",
  "Hice la B": "I did B",
  "ya lo habías decidido": "you had already decided it",
  "En firme": "Settled",
  "opción A": "option A",
  "sin Google": "no Google",
  "en español": "in Spanish",
  "Ya lo decidiste: la opción A": "You already decided: option A",
  "no te lo vuelve a preguntar": "it doesn't ask you again",
  "archivo": "file",
  "lee lo mismo una y otra vez": "reads the same over and over",
  "cambió": "changed",
  "igual": "same",
  "en «Modelo y consumo»": "in «Model & usage»",
  "otro día": "another day",
  "sesión nueva": "new session",
  "¿y qué sigue?": "what's next?",
  "¿Dónde quedamos?": "Where we left off",
  "Lo que se hizo": "What was done",
  "Dónde quedó el proyecto": "Where the project stands",
  "Lo nuevo desde tu visita": "What's new since your visit",
  "Tu misión siguiente": "Your next mission",
  "solo retomas: ya sabes qué sigue": "you just pick up: you know what's next",
  "Mi proyecto es…": "My project is…",
  "otra vez": "again",
  "el historial del chat, o una búsqueda": "the chat history, or a search",
  "hace dos semanas": "two weeks ago",
  "Usemos Google para entrar": "Let's sign in with Google",
  "Cambiamos: sin Google": "Change: no Google",
  "Hice el inicio con Google": "I built the Google sign-in",
  "una decisión vieja se coló": "an old decision slipped in",
  "Usemos Google": "Let's use Google",
  "Reemplazado": "Replaced",
  "En vigor": "In force",
  "Sin Google": "No Google",
  "al modelo, solo lo que aprobaste": "to the model, only what you approved",
  "Haz esto": "Do this",
  "¿qué recuerda, qué no y por qué?": "what does it remember, what not, and why?",
  "El director solicita: lo que cambió": "The director asks: what changed",
  "El modelo responde: 3 archivos": "The model answers: 3 files",
  "El director solicita: las pruebas": "The director asks: the tests",
  "El modelo responde: todas pasan": "The model answers: all pass",
  "el historial: cada paso, auditable": "the history: every step, auditable",
  "solicita: lo que cambió": "asks: what changed",
  "responde: 3 archivos": "answers: 3 files",
  "solicita: las pruebas": "asks: the tests",
  "responde: todas pasan": "answers: all pass",
  "tokens de entrada": "input tokens",
  "tokens de salida": "output tokens",
  "la caja negra, a la vista": "the black box, in plain sight",
  "Sigue con el login": "Go on with the login",
  "sin conexión": "offline",
  "conexión": "online",
  "el chat se congeló: ¿y ahora qué?": "the chat froze: now what?",
  "nota": "note",
  "ajuste": "tweak",
  "entrega": "delivery",
  "documento": "document",
  "historial": "history",
  "nada se pierde: queda en la memoria del proyecto": "nothing is lost: it stays in the project memory",
  "todo junto": "all at once",
  "escribirlo todo…": "typing it all out…",
  "Haz que el botón…": "Make the button…",
  "le llega la mitad": "only half arrives",
  "se transcribe en tu computador": "transcribed on your computer",
  "tu nota": "your note",
  "la lees y la corriges": "you read it and correct it",
  "Sin STL": "Without STL",
  "Con STL": "With STL",
  "Resuelto": "Solved",
  "✓ Resuelto": "✓ Solved",
};
const D = (texto) => (EN_DIBUJO && Object.hasOwn(DIBUJO_EN, texto) ? DIBUJO_EN[texto] : texto);
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
const PISTA_VOZ_ES = {"g1-e":12501,"g2-e":7264,"g3-e":9731,"g4-e":7646,"g5-e":9878,"g6-e":3784,"g7-e":5907,"s1-p1":2373,"s1-p2":2786,"s1-p3":2769,"s1-1":4087,"s1-2":4646,"s1-3":3948,"s1-c":5071,"s2-p1":2426,"s2-p2":1412,"s2-p3":2776,"s2-1":3711,"s2-2":2700,"s2-3":2042,"s2-4":4359,"s2-c":5156,"s3-p1":3380,"s3-p2":3166,"s3-1":2916,"s3-2":2798,"s3-3":5002,"s3-4":2241,"s3-5":3045,"s3-6":3400,"s3-c":4140,"s4-p1":3782,"s4-p2":1883,"s4-p3":3141,"s4-p4":2604,"s4-1":3537,"s4-2":4290,"s4-3":3915,"s4-4":2479,"s4-5":2876,"s4-6":3220,"s4-c":3581,"s5-p1":2440,"s5-1":3860,"s5-2":2285,"s5-3":2030,"s5-c":2321,"s6-p1":3846,"s6-1":3795,"s6-2":3514,"s6-3":3042,"s6-c":3091,"s7-p1":3805,"s7-1":4436,"s7-2":2258,"s7-3":3541,"s7-4":3132,"s7-5":1896,"s7-c":2658,"s8-p1":2835,"s8-p2":1923,"s8-1":4365,"s8-2":2077,"s8-3":2773,"s8-c":2455,"s9-p1":1421,"s9-p2":4019,"s9-1":4418,"s9-2":2926,"s9-3":1763,"s9-4":2872,"s9-5":2704,"s9-c":2804,"s11-p1":3471,"s11-p2":1971,"s11-1":3209,"s11-2":1538,"s11-3":3724,"s11-4":1808,"s11-5":4183,"s11-c":2347,"s12-p1":2229,"s12-p2":2258,"s12-1":5048,"s12-2":3691,"s12-3":3487,"s12-c":3506,"s13-p1":2542,"s13-p2":4317,"s13-1":5810,"s13-2":2757,"s13-3":4478,"s13-4":4215,"s13-5":4301,"s13-6":4290,"s13-c":2692,"s14-p1":3116,"s14-p2":4166,"s14-1":3755,"s14-2":3517,"s14-3":3180,"s14-4":2267,"s14-5":4202,"s14-6":4333,"s14-c":2389,"s15-p1":2011,"s15-p2":2693,"s15-p3":2717,"s15-1":5221,"s15-2":3885,"s15-3":5060,"s15-4":4353,"s15-5":4632,"s15-6":2285,"s15-7":2924,"s15-8":2955,"s15-9":3047,"s15-c":4359,"como-1":3554,"como-2":5728,"como-3":2544,"como-4":7545,"como-5":2482,"como-6":3434,"como-7":3693,"como-c":2312};
// La voz en inglés de «Getting started» (nmw6xp1d1tit) y de la estación 2 (nmw74uq8qtit): la gemela de Kai, en voz/en/, con
// su pista (tools/vozRecorrido.ts --en). De la estación 2, solo las animaciones con su voz entera: las demás callan enteras
// hasta que la cuota del día de Google alcance para todas sus frases
const PISTA_VOZ_EN = {"g1-e":13162,"g2-e":7034,"g3-e":9314,"g4-e":10178,"g5-e":10989,"g6-e":3338,"s1-p1":2399,"s1-p2":2858,"s1-p3":2126,"s1-1":3604,"s1-2":4267,"s1-3":3330,"s1-c":4830,"s2-p1":2591,"s2-p2":1483,"s2-p3":3113,"s2-1":3906,"s2-2":2406,"s2-3":2292,"s2-4":3421,"s2-c":4759,"s3-p1":3535,"s3-p2":2913,"s3-1":3819,"s3-2":2999,"s3-3":4836,"s3-4":2570,"s3-5":3606,"s3-6":3607,"s3-c":3684,"s4-p1":4336,"s4-p2":1933,"s4-p3":2974,"s4-p4":2273,"s4-1":3242,"s4-2":3467,"s4-3":3954,"s4-4":2383,"s4-5":3558,"s4-6":3410,"s4-c":4293,"s5-p1":3905,"s5-1":4038,"s5-2":2601,"s5-3":2610,"s5-c":1881,"s6-p1":3806,"s6-1":3925,"s6-2":3821,"s6-3":3415,"s6-c":2849,"s7-p1":3578,"s7-1":3002,"s7-2":2293,"s7-3":4010,"s7-4":3080,"s7-5":1610,"s7-c":2960,"s8-p1":3571,"s8-p2":2546,"s8-1":4746,"s8-2":1946,"s8-3":2444,"s8-c":2539,"s9-p1":1565,"s9-p2":3816,"s9-1":4731,"s9-2":3316,"s9-3":2138,"s9-4":2522,"s9-5":3616,"s9-c":2121,"s11-p1":4334,"s11-p2":1664,"s11-1":3508,"s11-2":1147,"s11-3":3128,"s11-4":1708,"s11-5":4142,"s11-c":2290,"s12-p1":2247,"s12-p2":2078,"s12-1":4934,"s12-2":3914,"s12-3":2547,"s12-c":3349,"s13-p1":1808,"s13-p2":5261,"s13-1":4440,"s13-2":2997,"s13-3":5225,"s13-4":3608,"s13-5":4748,"s13-6":3348,"s13-c":2992,"s14-p1":3081,"s14-p2":3631,"s14-1":3221,"s14-2":4277,"s14-3":2763,"s14-4":2298,"s14-5":4349,"s14-6":3894,"s14-c":2392,"como-1":3243,"como-2":5061,"como-3":2188,"como-4":6867,"como-5":1983,"como-6":2947,"como-7":3326,"como-c":2074};
// La pista de cada clave en el idioma de la página: en inglés, «Cómo empezar» y la estación 2 con la suya (lo que aún no la
// tiene calla, nunca con la voz en español); lo demás, con la de Kai
const vozEnIngles = (clave) => EN_DIBUJO && /^(como-|s\d+-|g\d+-e$)/.test(clave);
const pistaVoz = (clave) => (vozEnIngles(clave) ? PISTA_VOZ_EN : PISTA_VOZ_ES)[clave];
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
const ritmoDeClave = (clave) => (pistaVoz(clave) == null ? RAPIDEZ : RITMO_VOZ_ES[clave] ?? 1);
// Lo que dura la voz de un clip de Google en el reloj del clip (a 1x), en segundos
const segDeVoz = (clave) => pistaVoz(clave) / 1000 / ritmoDeClave(clave);
const claveDePaso = (j, enProblema, m) => `s${j + 1}-${enProblema ? 'p' : ''}${m + 1}`;
const conPista = (j, enProblema) => (enProblema ? PASOS_SEG[j].problema : PASOS_SEG[j].solucion).every((_, m) => pistaVoz(claveDePaso(j, enProblema, m)) != null);
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
  return Math.max(ENUNCIADO_SEG, pistaVoz(clave) == null ? tardaVoz(ENUNCIADOS[i] ?? '') : segDeVoz(clave) + RESPIRO_ENUNCIADO);
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
// Qué tan lejos está la cámara de algo: 0 a «cerca» o menos, 1 a «lejos» o más, suave entre los dos. Con ella el emblema de
// la estación 1 crece al acercarte y el anillo de la 2 se ve en color desde lejos (pd_estaciones_decoradas, nmw74wypntit)
const lejania = (distancia, cerca, lejos) => tramo(distancia, cerca, lejos);
// Dónde va cada anillo dorado de la línea (de 0 a 1 en la curva, que se recorre por su largo): tres entre cada estación y la
// siguiente, a la misma distancia uno del otro, y el último el de la llegada, «antes» antes de la parada (nmw74wypntit: «three
// rings between every station except before the first one», para sentir que se avanza un poco más rápido). Antes de la
// estación 1, ninguno. Pura
const ANILLOS_POR_TRAMO = 3;
function lugaresDeAnillos(paradas, antes) {
  return paradas.slice(1).flatMap((u, k) => {
    const desde = paradas[k], hasta = Math.max(desde, u - antes);
    return Array.from({ length: ANILLOS_POR_TRAMO }, (_, m) => desde + ((hasta - desde) * (m + 1)) / ANILLOS_POR_TRAMO);
  });
}
// La entrada, mucho más atrás (nota de voz del titular nmw85pz2mtit, 8 de noviembre de 2026): la cámara nace lejos, frente
// a la línea, y antes del primer anillo hay el mismo trecho que entre dos anillos de las estaciones 1 y 2; los tres anillos,
// a ese mismo paso, y el último, «antes» antes de la estación 1, como el de llegada de cada estación. Así, del inicio a la
// estación 1 hay lo mismo que de la estación 1 a la 2. Lo que queda antes de 0 se dibuja sobre la recta con que nace la
// línea (iniciar() › puntoEn). Pura
function entradaDeAnillos(paradas, antes) {
  const paso = (paradas[1] - antes - paradas[0]) / ANILLOS_POR_TRAMO, ultimo = paradas[0] - antes;
  const anillos = Array.from({ length: ANILLOS_POR_TRAMO }, (_, m) => ultimo - (ANILLOS_POR_TRAMO - 1 - m) * paso);
  return { nace: anillos[0] - paso, anillos, paso };
}
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
  c.font = `600 ${tam}px system-ui, sans-serif`; c.textAlign = alinea; c.fillStyle = color; c.fillText(D(texto), x, y);
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
  texto = D(texto);
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
      if (q > 0.4) letrero(c, `${q > 0.75 ? 3 : q > 0.55 ? 2 : 1} × ${L('los tokens', 'the tokens')}`, 282, 40, ROJO, 9, 'right');
      if (q > 0.7) letrero(c, 'otro mensaje, y otro, para corregir', 160, 156, ROJO, 9.5);
    },
    solucion: (c, q, tinta) => DE_ANTES[0](c, q, tinta),
  },
  { // 2. Las varias sesiones a la vez
    problema: (c, q) => {
      const foco = Math.floor(q * 9) % 4;
      [[30, 22], [180, 22], [30, 92], [180, 92]].forEach(([x, y], k) => {
        ventana(c, x, y, 110, 54, `${L('sesión', 'session')} ${k + 1}`, k === foco ? ROJO : '#8f8a7d');
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
      // El rótulo va arriba del Buzón: adentro se queda la idea cuando llega, sin pisarlo (nmw5eoz0rtit)
      actorStudio(c, 226, 80, 70, 36, false); letrero(c, 'el Buzón', 261, 74, MORADO, 9);
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
      // Las filas más juntas (22 en vez de 26) para que el sello de abajo no pise el último ✓ (nmw5eoz0rtit)
      for (let k = 0; k < 5; k++) { renglones(c, 42, 34 + k * 22, 100, 2, 'rgba(255, 255, 255, .35)', 1, 8); palomita(c, 162, 38 + k * 22, 4.5); }
      if (q > 0.1) { bola(c, 156, 148, 14, ORO, tramo(q, 0.1, 0.25)); letrero(c, 'sellado', 156, 151, '#1a1f33', 7.5); }
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
      ['opción A', 'sin Google', 'en español'].forEach((t, k) => letrero(c, `· ${D(t)}`, 42, 60 + k * 13, LUZ, 8.5, 'left'));
      actorDirector(c, 222, 60, 12); letrero(c, 'el director', 222, 84, ORO, 9);
      // La lupa se queda a la derecha de la lista, junto a lo que encontró, sin tapar el texto (nmw5eoz0rtit)
      if (q < 0.55) lupa(c, lerp(170, 122, tramo(q, 0.1, 0.45)), 57, 7);
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
      letrero(c, `${Math.round(q * q * 184000).toLocaleString(L('es', 'en'))} tokens`, 304, 28, ROJO, 11, 'right');
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
      letrero(c, `${Math.round(tramo(q, 0.3, 0.9) * 21000).toLocaleString(L('es', 'en'))} tokens`, 304, 28, VERDE, 11, 'right');
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
        c.save(); c.globalAlpha *= tramo(q, 0.1 + k * 0.13, 0.2 + k * 0.13); letrero(c, `· ${D(t)}`, 84, 58 + k * 18, LUZ, 9, 'left'); c.restore();
      });
      // Una sola misión siguiente a la vista, y solo retomas
      if (q > 0.54) placaMision(c, 100, 112, 120, 'Tu misión siguiente', q > 0.84, tramo(q, 0.54, 0.62));
      // Se acerca a la tarjeta pero se queda afuera de su borde, sin cruzarlo (nmw5eoz0rtit)
      actorDev(c, lerp(30, 54, tramo(q, 0.7, 0.84)), 122, 1.2);
      if (q > 0.86) letrero(c, 'solo retomas: ya sabes qué sigue', 160, 160, VERDE, 9.5);
    },
  },
  null,   // 10. (Salió: «qué sigue al volver de un descanso» se juntó con la 9 en «Hilo perdido», pd_fusion_olvidadizo; su lugar se queda vacío para que los demás segmentos conserven las claves de su voz)
  { // 11. Explicar otra vez el proyecto
    problema: (c, q) => {
      const s = Math.min(2, Math.floor(q * 3)), k = (q * 3) % 1;
      // Una sesión tras otra, cada una en lugar de la anterior: ya no se apilan una encima de otra (nmw5d6iqctit)
      ventana(c, 38, 32, 200, 110, `${L('sesión', 'session')} ${s + 1}`, ROJO);
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
      // La lupa termina debajo de «hace dos semanas», a la derecha del resaltado, sin pisar su letrero (nmw5eoz0rtit)
      if (q > 0.25) lupa(c, lerp(230, 200, tramo(q, 0.25, 0.5)), lerp(110, 58, tramo(q, 0.25, 0.5)), 6);
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
      [0, 1, 2].forEach((m) => { if (q > 0.35 + m * 0.12) letrero(c, '?', 172 + m * 38, 66 + (m % 2) * 58, ROJO, 14); });   // el del medio, más abajo: no pisa al modelo (nmw5eoz0rtit)
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
          globo(c, 64, y, `${L('El director espera al modelo', 'The director waits for the model')} · ${s} s`, '#8f8a7d', false, 0.9);
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
      caja(c, 64, 108, 92, 30, CIAN, 0.12, 6); letrero(c, 'tokens de entrada', 110, 119, CIAN, 7.5); letrero(c, entrada.toLocaleString(L('es', 'en')), 110, 133, '#fffaf0', 10);
      caja(c, 164, 108, 92, 30, VERDE, 0.12, 6); letrero(c, 'tokens de salida', 210, 119, VERDE, 7.5); letrero(c, salida.toLocaleString(L('es', 'en')), 210, 133, '#fffaf0', 10);
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
      if (q > 0.35) { wifi(c, 160, 100, ROJO, true, cae); letrero(c, 'sin conexión', 160, 134, ROJO, 10); cruz(c, 262, 70, 4, cae); }   // la ✗ debajo del modelo, no encima de él (nmw5eoz0rtit)
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
        cruz(c, 262, 70, 4, tramo(q, 0.74, 0.8));   // debajo del modelo, no encima de él (nmw5eoz0rtit)
      }
    },
    solucion: (c, q) => {
      // Hablas como hablarías con un amigo, incluso divagando (nmw56n724tit): el micrófono y sus ondas, mientras hablas
      actorDev(c, 38, 108, 1.3, q > 0.82);
      microfono(c, 70, 98, VERDE_DICTADO);
      if (q < 0.52) for (const r of [8, 13, 18]) { c.save(); c.globalAlpha *= 0.3 + 0.7 * Math.sin(q * 40 - r) ** 2; c.strokeStyle = VERDE_DICTADO; c.lineWidth = 1.4; c.beginPath(); c.arc(70, 92, r, -0.9, 0.9); c.stroke(); c.restore(); }
      // Se transcribe en tu computador. Los dos rótulos de abajo van en renglones aparte, ambos debajo del Buzón y de su marco
      // de atrás (que llega hasta 135,5), sin tocarlo ni apretarse entre ellos (nmw5eoz0rtit)
      if (q > 0.5) { caja(c, 14, 148, 6, 6, VERDE_DICTADO, 0.4, 2); letrero(c, 'se transcribe en tu computador', 26, 154, VERDE_DICTADO, 8.5, 'left'); }
      // Tu nota, en el Buzón: la lees y la corriges antes de que salga
      actorStudio(c, 108, 40, 120, 92, false); letrero(c, 'Buzón del Studio', 168, 34, MORADO, 9);
      const escrita = tramo(q, 0.1, 0.56);
      caja(c, 118, 52, 100, 70, VERDE_DICTADO, 0.1, 7);
      letrero(c, 'tu nota', 124, 62, VERDE_DICTADO, 7.5, 'left');
      // Los renglones de la nota empiezan en 72 (antes 70), para dejar arriba, a la derecha, el lugar de la lupa
      for (let k = 0; k < 4; k++) {
        const visible = escrita * 4 > k;
        if (!visible) continue;
        const quitada = k === 2 && q > 0.78, agregada = k === 3;
        if (agregada && q < 0.88) continue;
        renglones(c, 124, 72 + k * 12, k === 3 ? 60 : 84, 1, agregada ? VERDE : 'rgba(255, 255, 255, .45)', quitada ? 0.35 : 1);
        if (quitada) trazo(c, 122, 73.5 + k * 12, 210, 73.5 + k * 12, ROJO, tramo(q, 0.78, 0.84));
        if (agregada) letrero(c, '+', 196, 78 + k * 12, VERDE, 9, 'left');
      }
      // La lupa va adentro de la tarjeta de tu nota (arriba a la derecha) y el rótulo, debajo del Buzón, no sobre su borde
      if (q > 0.74) { lupa(c, 202, 61, 6); letrero(c, 'la lees y la corriges', 168, 168, '#fffaf0', 8.5); }
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
// Los cinco de «Hilo perdido» y «Modelo olvidadizo» (pd_fusion_olvidadizo), sus dos enunciados, las dos frases en rojo de
// volver de una pausa y «con una sola misión siguiente a la vista:», hablan con Kai desde la noche del 6 de noviembre de
// 2026, con su «Confirmo» (nmw5ej4oytit, pd_voz_hilo)
const CLAVES_SIN_VOZ_TODAVIA = new Set([]);
const sinVozTodavia = (clave) => {
  const seg = /^s(\d+)-/.exec(clave);
  // «Cómo empezar» en inglés, sin voz hasta que se revise su texto en inglés (t_decide_voz_ingles_cuando): su voz en español no
  // suena bajo un rótulo en inglés (nmw6r9827tit)
  if (vozEnIngles(clave)) return pistaVoz(clave) == null;
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
// La estación 2 en inglés (pd_bilingue; t_decide_estacion2_textos, nmw738o1ktit): los guiones, fieles al español frase por
// frase, con los mismos cortes (nmw3q7lw7tit), y los cierres adaptados, como los diría alguien de habla inglesa
// (nmw3y11qftit). Los de arriba siguen siendo los que lee tools/vozRecorrido.ts para la voz en español
const PASOS_SEG_EN = [
  { problema: [[0, 'If you sent it and something was missing,'], [0.4, 'you send another and another to correct it,'], [0.72, 'multiplying your token usage']], solucion: [[0, 'With STL, your notes go to an Inbox first:'], [0.3, 'they wait there, and you can review and edit them as much as you want'], [0.68, 'before the director actually sends them to the model']] },
  { problema: [[0, 'With four or more sessions at once,'], [0.35, 'your attention splits'], [0.6, 'and you wear yourself out trying to follow them all']], solucion: [[0, 'With STL, everything comes in through a single channel'], [0.35, 'and gets organized automatically'], [0.55, 'so you focus only'], [0.72, 'on the next strategic step, one at a time']] },
  { problema: [[0, 'When ideas or tweaks come up in the middle of something,'], [0.5, 'the rest falls behind and gets lost']], solucion: [[0, 'With STL, your idea goes to the Inbox,'], [0.18, 'the director gives it its place on the route'], [0.36, 'and, if doing it now is not strategic, it waits in its phase.'], [0.6, 'So you finish what you were going to do first,'], [0.76, 'without losing that new idea or tweak,'], [0.88, 'and it stays on the route where it belongs']] },
  { problema: [[0, 'Reading three pages of an answer in a row wears you out,'], [0.3, 'and your attention drifts.'], [0.45, 'You end up not reading what the model answers'], [0.75, 'and just saying «yes» to everything']], solucion: [[0, 'STL shows you one idea at a time,'], [0.14, 'with a «Got it» button before uncovering the next.'], [0.36, 'What comes next waits covered until you get there.'], [0.54, 'It can also read it aloud to you,'], [0.68, 'and you can comment on each idea or paragraph'], [0.82, 'without explaining to the model which part you mean']] },
  { problema: [[0, 'How do you know what you already read and what you didn\'t?']], solucion: [[0, 'With STL, each idea you read stays marked'], [0.4, 'and you know exactly where you are:'], [0.7, 'what you have read and what you haven\'t']] },
  { problema: [[0, 'Does the model change documents and ask you to reread them?']], solucion: [[0, 'With STL, what you already read stays sealed;'], [0.3, 'what is new arrives separately, in a short document,'], [0.65, 'with only what changed, and easy to read']] },
  { problema: [[0, 'Does the model ask you something you already decided?']], solucion: [[0, 'STL has its own project memory system:'], [0.16, 'what you decided stays settled,'], [0.3, 'and, before asking you, the director searches.'], [0.55, 'It was already decided: option A.'], [0.8, 'It doesn\'t ask you again']] },
  { problema: [[0, 'Each new session rereads the same things,'], [0.5, 'and the tokens evaporate']], solucion: [[0, 'With STL, the director receives everything together, with the map,'], [0.4, 'and reads only what changed,'], [0.62, 'optimizing your input token usage']] },
  { problema: [[0, 'Do you come back from a break'], [0.4, 'and not know where you were or what\'s next in each session?']], solucion: [[0, 'With STL, the «Where we left off» section is waiting for you:'], [0.2, 'an always up-to-date report of what was done'], [0.38, 'and of where the project stands,'], [0.54, 'with a single next mission in view:'], [0.78, 'you just pick up, and you already know what\'s next']] },
  { problema: [], solucion: [] },   // 10. (salió: se juntó con la 9)
  { problema: [[0, 'In every new session, do you explain everything to it again'], [0.55, 'to define what it will be about?']], solucion: [[0, 'STL builds its own optimized system'], [0.2, 'of project memory:'], [0.36, 'the state stays in files, in your project map'], [0.6, 'and in everything you said.'], [0.76, 'The director already knows it all: you need to repeat nothing']] },
  { problema: [[0, 'Does your context get polluted'], [0.4, 'by frequent changes of decision?']], solucion: [[0, 'With STL, a decision you change is marked replaced in the history'], [0.4, 'and is no longer part of the new context that goes to the model:'], [0.72, 'you only send decisions you approved']] },
  { problema: [[0, 'The model is a black box:'], [0.4, 'sometimes you don\'t know what it remembers, what it doesn\'t, and why']], solucion: [[0, 'STL shows you, graphically, the whole inference cycle:'], [0.2, 'how your team and the model communicate,'], [0.34, 'how long each one takes to carry out its parts, and its usage,'], [0.52, 'and exactly who asks what of whom.'], [0.68, 'So you understand what happens each time you ask the model something'], [0.85, 'and you keep this history, to audit it and learn']] },
  { problema: [[0, 'Your internet goes down in the middle of your work,'], [0.45, 'and the chat with the model stops: now what?']], solucion: [[0, 'With STL Studio, you keep working offline:'], [0.2, 'the Inbox collects your notes, tweaks and deliveries,'], [0.4, 'and you keep reading documents and answers'], [0.58, 'or auditing the model\'s work.'], [0.74, 'Nothing is lost: everything stays in the project memory.'], [0.88, 'When the connection comes back, the director receives it all together.']] },
  { problema: [[0, 'You have the idea clear in your head,'], [0.36, 'but writing it all out is tiring,'], [0.66, 'and only half of it reaches the model.']], solucion: [[0, 'With STL, you dictate it: you talk as you would with a friend,'], [0.1, 'naturally, explaining what you have in mind.'], [0.2, 'You can even ramble, it doesn\'t matter: the director will understand you.'], [0.32, 'What matters is that you express your idea the way you really want it,'], [0.42, 'in your natural language: leave the understanding to the director.'], [0.52, 'Your note is transcribed on your computer.'], [0.62, 'Since it goes to the Inbox and not straight to the model,'], [0.74, 'you read it and correct it before it arrives:'], [0.86, 'you take out or add whatever you want.']] },
];
const CIERRES_EN = [
  ['Half-finished messages', 'Goodbye to fixing half-finished messages: you check it before it goes.'],
  ['Your divided attention', 'Free from juggling sessions: your attention, on a single step.'],
  ['The ideas that got lost', 'No idea gets lost, and you finish what you started.'],
  ['Exhausting answers', 'Reading no longer wears you out: one idea at a time.'],
  ['Not knowing what you read', 'You always know where you are.'],
  ['Rereading what you read', 'Never reread what you already read.'],
  ['Repeated questions', 'What you decided stays decided.'],
  ['Tokens that evaporate', 'Your tokens, only for what is new.'],
  ['Losing your place and what\'s next', 'You pick up right where you left off.'],
  null,   // 10. (salió: se juntó con la 9)
  ['Explaining it all again', 'No more repeating yourself to the model.'],
  ['A polluted context', 'A clean context, with only what you approved.'],
  ['The model, a black box', 'The black box, now in plain sight.'],
  ['Without internet, it all stopped', 'No internet, and your work goes on.'],
  ['The fatigue of typing', 'Talk, correct and send: no extra typing.'],
];
if (EN_DIBUJO) {
  PASOS_SEG.forEach((s, j) => Object.assign(s, PASOS_SEG_EN[j]));
  CIERRES.splice(0, CIERRES.length, ...CIERRES_EN);
}
// Lo que dura el cierre: al menos CIERRE_SEG (cuatro segundos, para que se alcance a leer el ✓, el problema resuelto y la
// frase de Kai; nota de voz del 5 de noviembre), y si su voz tarda más, lo que tarda con un respiro
const CIERRE_SEG = 4;
const claveDeCierre = (j) => `s${j + 1}-c`;
const cierreSeg = (j) => {
  const clave = claveDeCierre(j);
  return Math.max(CIERRE_SEG, pistaVoz(clave) == null ? tardaVoz(CIERRES[j]?.[1] ?? '') : segDeVoz(clave) + RESPIRO_FRASE + 0.4);
};
// Un segmento entero: su situación en rojo, su solución y su cierre
const segmentoSeg = (j) => problemaSeg(j) + solucionSeg(j) + cierreSeg(j);

// ── «Cómo empezar», la estación 3 (pd_como_empezar, en lugar de «¿Reemplaza a otros métodos?», nmw47ga2wtit): una sola
// animación, en el mismo reproductor de los problemas y con sus mismos mandos (nmw4ircrjtit, nmw4irz3etit), que se abre sola
// al llegar. Su guion, confirmado el 6 de noviembre de 2026 tal como está (nmw4f5xg4tit): siete escenas y su cierre, cada
// una con su clip de Kai (como-1 … como-7 y como-c, tools/vozRecorrido.ts); cada escena dura lo que su voz, con un mínimo
// para alcanzar a verla. GUIA es su lugar en el reproductor: no es un problema de la estación 2
const GUIA = 100;
// En la página en inglés, «Cómo empezar» entero en inglés: su guion, lo que se le pide al modelo, los rótulos de sus
// escenas y sus botones (nota de voz del titular nmw6r9827tit). Con su voz en inglés, la gemela de Kai, desde el
// «Confirmo» del 7 de noviembre de 2026 (nmw6xp1d1tit): voz/en/, con su pista (PISTA_VOZ_EN)
const COMO_EN = EN_DIBUJO;
const L = (es, en) => (COMO_EN ? en : es);
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
// El de la página en inglés, en su lugar (el de arriba es el que lee tools/vozRecorrido.ts para la voz en español)
const GUION_COMO_EN = {
  escenas: [
    'Want to try the Studio now? This is how you start.',
    'First, bring it to your computer: clone the repository, or download it from GitHub.',
    'Put it in the folder where you want to work.',
    'For your peace of mind, first ask your model for a security scan: to confirm it brings nothing malicious.',
    'Then ask it to install it.',
    'From there, the Studio guides you step by step.',
    'If you have any doubt, read the documentation.',
  ],
  cierre: 'Done: you are up and running.',
};
if (COMO_EN) Object.assign(GUION_COMO, GUION_COMO_EN);
// Lo que se le pide al modelo en las escenas del escaneo y de la instalación (de 0: la 3 y la 4), debajo de la animación como
// un ejemplo, en texto y sin «Copiar» (nmw56hkz8tit, que reemplaza a nmw4f6alqtit), y el enlace de la última, al README del repositorio en GitHub (nmw4f6lictit); la
// ventana a la que se le pide se llama «Claude Code» (nmw4irns1tit)
const PEDIDOS_COMO = { 3: 'Revisa este repositorio y dime si trae algo malicioso antes de instalarlo', 4: 'Inicializa STL Studio' };
if (COMO_EN) Object.assign(PEDIDOS_COMO, { 3: 'Review this repository and tell me whether it brings anything malicious before installing it', 4: 'Initialize STL Studio' });
const ENLACE_COMO = 'https://github.com/ARGWABOT/STL-Sacred_Time_Line#readme';
const VENTANA_COMO = 'Claude Code';
const ESCENA_SEG = 4.5, ESCENA_PEDIDO_SEG = 6.5;
const nComo = () => GUION_COMO.escenas.length + 1;   // las siete escenas y su cierre
const claveDeComo = (k) => (k < GUION_COMO.escenas.length ? `como-${k + 1}` : 'como-c');
const textoDeComo = (k) => GUION_COMO.escenas[k] ?? GUION_COMO.cierre;
const escenaSeg = (k) => {
  const clave = claveDeComo(k);
  const voz = pistaVoz(clave) == null || sinVozTodavia(clave) ? tardaVoz(textoDeComo(k)) : segDeVoz(clave) + RESPIRO_FRASE + 0.4;
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
  if (i === GUIA) { const e = escenaDeComo(t); return pistaVoz(e.clave) == null ? null : { clave: e.clave, desde: e.desde, voz: segDeVoz(e.clave) }; }
  const grupo = GRANDES[i] ?? GRANDES[0], s = Math.max(0, Math.min(duraClip(i), t));
  const e = enunciadoSeg(i), ce = claveEnunciado(i);
  if (s < e) return pistaVoz(ce) == null ? null : { clave: ce, desde: 0, voz: segDeVoz(ce) };
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
    if (s < desde + cierreSeg(j)) return pistaVoz(cierre) == null ? null : { clave: cierre, desde, voz: segDeVoz(cierre) };
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
  // Con tres renglones, el primero baja para no pisar «Resuelto» (nmw5eoz0rtit)
  renglones.forEach((r, m) => letrero(c, r, 114, (renglones.length > 2 ? 100 : 98 - (renglones.length - 1) * 4) + m * 16, '#fffaf0', 14, 'left'));
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
    caja(c, 30, 70, 100, 18, CIAN, clona ? 0.35 : 0.1, 6); letrero(c, L('clonar el repositorio', 'clone the repository'), 80, 82.5, '#fffaf0', 8);
    caja(c, 30, 98, 100, 18, ORO, clona ? 0.1 : 0.35, 6); letrero(c, L('descargar el ZIP', 'download the ZIP'), 80, 110.5, '#fffaf0', 8);
    // El computador
    caja(c, 196, 46, 104, 66, LUZ, 0.08, 6); caja(c, 236, 112, 24, 8, LUZ, 0.2, 2); caja(c, 222, 120, 52, 5, LUZ, 0.2, 2);
    letrero(c, L('tu computador', 'your computer'), 248, 140, LUZ, 9);
    // Lo que viaja: por arriba si lo clonas, por abajo si lo descargas
    const u = clona ? tramo(q, 0.1, 0.42) : tramo(q, 0.58, 0.9), y0 = clona ? 79 : 107;
    trazo(c, 132, y0, 196, 79, clona ? CIAN : ORO, 0.6, true);
    // El paquete solo se dibuja mientras viaja: quieto, invisible, igual ocuparía lugar sobre la ventana y sobre su destino (nmw5eoz0rtit)
    if (u > 0 && u < 1) caja(c, lerp(134, 236, u), lerp(y0 - 6, 72, u), 14, 12, MORADO, 0.5, 3);
    if (q > 0.42) { caja(c, 236, 66, 26, 26, MORADO, 0.35, 5); letrero(c, 'STL', 249, 82, '#fffaf0', 8); }
  },
  // 3 · Ponlo en la carpeta donde quieras trabajar: el Studio cae en su carpeta
  (c, q) => {
    carpeta(c, 104, 92, 112, 60, ORO, L('donde quieras trabajar', 'where you want to work'));
    const cae = tramo(q, 0.1, 0.55);
    caja(c, 140, lerp(24, 104, cae), 40, 34, MORADO, 0.4, 6); letrero(c, 'STL', 160, lerp(24, 104, cae) + 21, '#fffaf0', 9);
    if (q > 0.6) palomita(c, 228, 104, 6, tramo(q, 0.6, 0.7));
    actorDev(c, 50, 120, 1.3, q > 0.6);
  },
  // 4 · El escaneo de seguridad: le pides a Claude Code que lo revise, la lupa pasa por sus archivos y no trae nada malicioso
  (c, q) => {
    ventana(c, 14, 26, 176, 64, VENTANA_COMO, CIAN);
    pedidoEscrito(c, 22, 50, 160, PEDIDOS_COMO[3], tramo(q, 0.04, 0.4));
    actorModelo(c, 48, 132, 9); letrero(c, L('tu modelo', 'your model'), 48, 156, MODELO, 8);
    // Los archivos del Studio, en su carpeta, y la lupa que los recorre
    carpeta(c, 200, 34, 104, 112, ORO, '');
    for (let k = 0; k < 6; k++) {
      renglones(c, 210, 46 + k * 16, 70, 1, 'rgba(255, 255, 255, .4)');
      if (q > 0.5 + k * 0.05) palomita(c, 292, 47.5 + k * 16, 3.2, tramo(q, 0.5 + k * 0.05, 0.54 + k * 0.05));
    }
    if (q > 0.42 && q < 0.86) { const u = tramo(q, 0.44, 0.84); lupa(c, 250, lerp(44, 126, u), 8); trazo(c, 92, 132, 200, 90, CIAN, 0.5, true); }
    if (q > 0.86) letrero(c, L('nada malicioso', 'nothing malicious'), 252, 160, VERDE, 10);
  },
  // 5 · Después, pídele que lo instale: «Inicializa STL Studio» y su barra que se llena
  (c, q) => {
    ventana(c, 14, 26, 176, 50, VENTANA_COMO, CIAN);
    pedidoEscrito(c, 22, 52, 160, PEDIDOS_COMO[4], tramo(q, 0.04, 0.3));
    const k = tramo(q, 0.34, 0.82);
    if (q > 0.32) { barra(c, 22, 96, 160, k, VERDE); letrero(c, k < 1 ? L('instalando…', 'installing…') : L('instalado', 'installed'), 102, 124, k < 1 ? '#fffaf0' : VERDE, 9); }
    if (k >= 1) palomita(c, 190, 101, 5);
    actorStudio(c, 214, 46, 90, 76); letrero(c, 'STL Studio', 259, 40, MORADO, 9);
  },
  // 6 · Desde ahí, el Studio te guía paso a paso: tu primera misión, cada paso con su ✓
  (c, q) => {
    actorStudio(c, 20, 40, 104, 96); letrero(c, 'STL Studio', 72, 34, MORADO, 9);
    letrero(c, L('tu primera misión', 'your first mission'), 222, 40, ORO, 9.5);
    [1, 2, 3].map((n) => L(`Paso ${n}`, `Step ${n}`)).forEach((paso, m) => {
      const a = 0.12 + m * 0.24;
      if (q > a - 0.1) placaMision(c, 158, 52 + m * 28, 128, paso, q > a + 0.16, tramo(q, a - 0.1, a));
    });
    actorDev(c, 296, 150, 1.1, q > 0.8);
  },
  // 7 · Si te queda alguna duda, la documentación: el README, que se abre con su enlace de abajo
  (c, q) => {
    actorDev(c, 70, 112, 1.6, q > 0.55);
    if (q < 0.55) letrero(c, '?', 92, 86, ORO, 13, 'left');
    ventana(c, 150, 30, 140, 116, L('README · la documentación', 'README · the documentation'), ORO);
    renglones(c, 162, 52, 112, 8, 'rgba(255, 241, 196, .45)', tramo(q, 0.1, 0.4), 10);
    if (q > 0.3) lupa(c, lerp(180, 250, tramo(q, 0.3, 0.8)), lerp(64, 110, tramo(q, 0.3, 0.8)), 8);
  },
];
// Una escena de «Cómo empezar» (k, de 0; la última es su cierre), q de 0 a 1 dentro de ella, y p lo que va de toda
function pintarComo(c, k, q, p) {
  const n = GUION_COMO.escenas.length;
  if (k >= n) { pintarCierre(c, L('En marcha', 'Up and running'), GUION_COMO.cierre, q, '', L('Listo', 'Done')); pintarBarra(c, p); return; }
  c.save(); c.translate(CONTENIDO.x, CONTENIDO.y); c.scale(CONTENIDO.escala, CONTENIDO.escala);
  ESCENAS_COMO[k](c, q);
  c.restore();
  caja(c, 8, 5, 76, 14, ORO, 0.25, 7); letrero(c, L('Cómo empezar', 'Getting started'), 46, 15.5, '#fff1c4', 8.5);
  caja(c, 262, 5, 50, 14, ORO, 0.2, 7); letrero(c, L(`${k + 1} de ${n}`, `${k + 1} of ${n}`), 287, 15.5, '#fff1c4', 8.5);
  rotuloLargo(c, textoDeComo(k));
  pintarBarra(c, p);
}

// El bucle de la instalación, en la pantalla de pie de la estación 3 (pd_instalacion_bucle, como eligió leonc, nmw6xq68htit):
// corto y sin repetir la animación entera (nmw6r6qq5tit), en tres tiempos con los nombres de las tres referencias de la
// derecha (nmw6u5bqttit): la descarga cae en la carpeta, el Studio queda en tu carpeta y le pides a tu agente que lo
// instale, con su barra. Se dibuja en un lienzo de 320 × 186; devuelve el tiempo (0, 1 o 2), para que la referencia que
// nombra se encienda mientras tanto
const BUCLE_SEG = 3.2, BUCLE_TIEMPOS = 3;
const ROTULOS_BUCLE = () => [L('Descárgalo', 'Download it'), L('Tu carpeta', 'Your folder'), L('Pídeselo a tu agente', 'Ask your agent')];
const COLORES_BUCLE = [CIAN, ORO, VERDE];
function pintarBucleInstalar(c, s) {
  const dura = BUCLE_SEG * BUCLE_TIEMPOS, vuelta = s >= 0 ? s % dura : (s % dura) + dura;
  const k = Math.min(BUCLE_TIEMPOS - 1, Math.floor(vuelta / BUCLE_SEG)), q = (vuelta - k * BUCLE_SEG) / BUCLE_SEG;
  c.clearRect(0, 0, 320, 186);
  const fondo = c.createRadialGradient(160, 80, 10, 160, 93, 190);
  fondo.addColorStop(0, '#141a2e'); fondo.addColorStop(1, '#07090f');
  c.fillStyle = fondo; c.fillRect(0, 0, 320, 186);
  // Arriba, el nombre del tiempo, con su número y el color de su referencia
  caja(c, 8, 8, 304, 22, COLORES_BUCLE[k], 0.18, 9);
  letrero(c, `${k + 1} · ${ROTULOS_BUCLE()[k]}`, 160, 23.5, '#fffaf0', 12);
  if (k === 0) {
    // La flecha baja hasta la carpeta y deja dentro el paquete del Studio
    carpeta(c, 110, 108, 100, 56, ORO, '');
    const baja = tramo(q, 0.05, 0.6);
    if (q < 0.62) {
      const y = lerp(40, 112, baja);
      c.save(); c.fillStyle = CIAN; c.beginPath(); c.roundRect(155, y - 26, 10, 22, 3); c.fill();
      c.beginPath(); c.moveTo(146, y - 6); c.lineTo(174, y - 6); c.lineTo(160, y + 10); c.closePath(); c.fill(); c.restore();
    }
    if (q > 0.6) { caja(c, 140, 118, 40, 34, MORADO, 0.4, 6); letrero(c, 'STL', 160, 139, '#fffaf0', 9); }
  } else if (k === 1) {
    // El Studio, quieto en tu carpeta, con su ✓
    carpeta(c, 100, 70, 120, 84, ORO, '');
    caja(c, 135, 90, 50, 44, MORADO, 0.4, 7); letrero(c, 'STL', 160, 117, '#fffaf0', 11);
    if (q > 0.35) palomita(c, 236, 112, 8, tramo(q, 0.35, 0.5));
  } else {
    // Le pides a tu agente que lo instale, letra a letra, y la barra se llena
    ventana(c, 24, 44, 272, 62, VENTANA_COMO, CIAN);
    pedidoEscrito(c, 34, 72, 250, PEDIDOS_COMO[4], tramo(q, 0.04, 0.35));
    const lleno = tramo(q, 0.4, 0.85);
    if (q > 0.38) {
      barra(c, 44, 128, 232, lleno, VERDE);
      letrero(c, lleno < 1 ? L('instalando…', 'installing…') : L('instalado', 'installed'), 160, 160, lleno < 1 ? '#fffaf0' : VERDE, 11);
      if (lleno >= 1) palomita(c, 288, 133, 6);
    }
  }
  return k;
}

// El video corto (video-corto.js) deja cada problema con una sola situación, y entonces el «1 de 1» no va
let sinCuenta = false;
// En un teléfono, el reproductor ocupa toda la pantalla y lo que no es dibujo va en HTML, fuera del lienzo (nmw8652hjtit,
// nmw87ytm7tit, nmw887qwvtit): «Sin STL» y «1 de 3» arriba, el subtítulo en una franja de un renglón bajo el dibujo y la barra
// para adelantar o devolver abajo. aparte: { pildoras(modo, cuenta), sub(texto, rojo) }; null en el computador
let aparte = null;
function pintarClip(ctx, i, t) {
  // Una vez, sin repetirse sola: al terminar queda en su último cuadro
  const { n, p, enEnunciado, enProblema, enCierre, k, q, j, texto: paso } = pasoDeClip(i, t);
  const segmento = SEGMENTOS[j];
  ctx.setTransform(4, 0, 0, 4, 0, 0);
  ctx.clearRect(0, 0, 320, 200);
  const fondo = ctx.createRadialGradient(160, 80, 10, 160, 100, 200);
  fondo.addColorStop(0, '#141a2e'); fondo.addColorStop(1, '#07090f');
  ctx.fillStyle = fondo; ctx.fillRect(0, 0, 320, 200);
  if (aparte) {
    const cuenta = n > 1 || !sinCuenta ? `${k + 1} ${L('de', 'of')} ${n}` : '';
    aparte.pildoras(i === GUIA || enEnunciado || enCierre ? null : enProblema ? 'sin' : 'con', i === GUIA || enEnunciado ? '' : cuenta);
    aparte.sub(i === GUIA || enEnunciado || enCierre ? '' : paso ?? '', enProblema);
  }
  if (i === GUIA) return void pintarComo(ctx, k, q, p);
  if (enEnunciado) {
    pintarEnunciado(ctx, paso, q);
    pintarBarra(ctx, p);
    return;
  }
  if (enCierre) {
    pintarCierre(ctx, CIERRES[j]?.[0] ?? '', paso, q, n > 1 || !sinCuenta ? `${k + 1} ${L('de', 'of')} ${n}` : '');
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
  if (aparte) return;   // las píldoras, el subtítulo y la barra van fuera del dibujo
  // «Without STL» es más largo que «Sin STL»: su píldora, un poco más ancha
  const pildora = L(52, 62);
  caja(ctx, 8, 5, pildora, 14, enProblema ? ROJO : VERDE, 0.25, 7);
  letrero(ctx, enProblema ? 'Sin STL' : 'Con STL', 8 + pildora / 2, 15.5, enProblema ? '#ffc2cf' : '#dff5e8', 8.5);
  // Cuál de las situaciones se ve: «1 de 3» (en el video, con una sola, no va)
  if (n > 1 || !sinCuenta) {
    caja(ctx, 262, 5, 50, 14, enProblema ? ROJO : VERDE, 0.2, 7);
    letrero(ctx, `${k + 1} ${L('de', 'of')} ${n}`, 287, 15.5, enProblema ? '#ffc2cf' : '#dff5e8', 8.5);
  }
  if (paso) letrero(ctx, paso, 160, 190, enProblema ? '#ffc2cf' : '#fffaf0', tamanoQueCabe(ctx, paso, 11, 300));
  pintarBarra(ctx, p);
}
// La barra de lo que va: se llena hasta el final y ahí se queda; con su punta, para ver dónde va y dónde dar clic
function pintarBarra(ctx, p) {
  if (aparte) return;   // en el teléfono, la barra es la de HTML, bajo el dibujo
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

  // ── El cielo de estrellas, en lugar del suelo (decisiones del titular nmw5erxrytit, nmw5es4cgtit, nmw5es6twtit,
  // nmw5gvj21tit y nmw5iur8itit; nota .stl/docs/director/estaciones-decoradas.md, partes 3 y 4). Se genera por código al
  // cargar, sin imágenes, en tres capas a distintas profundidades (lejanas, intermedias y una banda tenue de galaxia),
  // lejos (varias veces los 28 de distancia entre estaciones), pequeñas y tenues, solo blancos y azules fríos: nada de
  // dorado, que es de la línea. Cada capa es un THREE.Points (un solo dibujo) que acompaña a la cámara en paralaje.
  // La semilla es fija: el mismo cielo en cada visita (nunca Math.random aquí).
  const CIELO_SEMILLA = 0x5eed5ca1;
  const mulberry32 = (a) => () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const cieloAzar = mulberry32(CIELO_SEMILLA);
  // Una de cada diez, despacio (decisión del titular nmw5mkt58tit): 1 de cada 10 estrellas, elegida con la misma semilla,
  // titila con un ciclo propio de 3 a 6 s entre el 35 % y el 100 % de su brillo. Con movimiento reducido ninguna titila.
  const TITILA = 1 / 10, CICLO_MIN = 3, CICLO_MAX = 6, BRILLO_MIN = 0.35;
  const CIELO_COLORES = ['#ffffff', '#dfe9ff', '#bcd2ff', '#9fbfff'].map((c) => new THREE.Color(c));
  // radio: a qué distancia; sigue: cuánto de lo que se mueve la cámara la acompaña la capa (1: nada de paralaje)
  const CAPAS_CIELO = [
    { n: 900, radio: 420, sigue: 0.98, tam: [1.1, 1.9], brillo: [0.3, 0.75], banda: false },   // lejanas: casi no se mueven
    { n: 700, radio: 260, sigue: 0.9, tam: [1.6, 2.8], brillo: [0.3, 0.8], banda: false },      // intermedias
    { n: 600, radio: 340, sigue: 0.95, tam: [1.0, 1.7], brillo: [0.15, 0.4], banda: true },     // la banda tenue de galaxia
  ];
  // El paralaje, un 25 % más rápido (nota de voz del titular nmw753vdutit): lo que cada capa se queda atrás de la cámara,
  // (1 − sigue), por 1,25. La cantidad de estrellas no cambia
  const PARALAJE_CIELO = 1.25;
  const cieloUniformes = { uTiempo: { value: 0 }, uMueve: { value: quieto ? 0 : 1 }, uPix: { value: renderer.getPixelRatio() } };
  const capasCielo = CAPAS_CIELO.map((capa) => {
    // En un teléfono, la mitad (el sorteo es el mismo: las que quedan son las primeras de siempre)
    const cantidad = Math.round(capa.n * (movil ? 0.5 : 1));
    const pos = new Float32Array(cantidad * 3), col = new Float32Array(cantidad * 3);
    const tam = new Float32Array(cantidad), brillo = new Float32Array(cantidad), ciclo = new Float32Array(cantidad), fase = new Float32Array(cantidad);
    for (let i = 0; i < cantidad; i++) {
      // Un punto de la esfera; la banda es un círculo máximo inclinado, con algo de grosor
      let y = cieloAzar() * 2 - 1;
      const giro = cieloAzar() * Math.PI * 2;
      const grosor = (cieloAzar() + cieloAzar() + cieloAzar() - 1.5) * 0.28;
      if (capa.banda) y = grosor;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      let x = Math.cos(giro) * r, z = Math.sin(giro) * r;
      if (capa.banda) { const k = 0.5; const y2 = y * Math.cos(k) - z * Math.sin(k); z = y * Math.sin(k) + z * Math.cos(k); y = y2; }
      pos.set([x * capa.radio, y * capa.radio, z * capa.radio], i * 3);
      const c = CIELO_COLORES[Math.floor(cieloAzar() * CIELO_COLORES.length)];
      col.set([c.r, c.g, c.b], i * 3);
      tam[i] = capa.tam[0] + cieloAzar() * (capa.tam[1] - capa.tam[0]);
      brillo[i] = capa.brillo[0] + cieloAzar() * (capa.brillo[1] - capa.brillo[0]);
      const titila = cieloAzar() < TITILA;   // se sortea siempre, titile o no, para que el cielo no cambie
      const dura = CICLO_MIN + cieloAzar() * (CICLO_MAX - CICLO_MIN);
      ciclo[i] = titila ? dura : 0;
      fase[i] = cieloAzar() * Math.PI * 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aTam', new THREE.BufferAttribute(tam, 1));
    geo.setAttribute('aBrillo', new THREE.BufferAttribute(brillo, 1));
    geo.setAttribute('aCiclo', new THREE.BufferAttribute(ciclo, 1));
    geo.setAttribute('aFase', new THREE.BufferAttribute(fase, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), capa.radio * 1.01);   // no se dibuja lo que no se ve
    const mat = new THREE.ShaderMaterial({
      uniforms: cieloUniformes, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `
        attribute vec3 aColor; attribute float aTam; attribute float aBrillo; attribute float aCiclo; attribute float aFase;
        uniform float uTiempo; uniform float uMueve; uniform float uPix;
        varying vec3 vColor; varying float vAlfa;
        void main() {
          float f = 1.0;
          if (aCiclo > 0.0 && uMueve > 0.5) f = ${BRILLO_MIN.toFixed(2)} + ${(1 - BRILLO_MIN).toFixed(2)} * (0.5 + 0.5 * sin(uTiempo * 6.2831853 / aCiclo + aFase));
          vColor = aColor; vAlfa = aBrillo * f;
          gl_PointSize = aTam * uPix;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        varying vec3 vColor; varying float vAlfa;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          gl_FragColor = vec4(vColor, vAlfa * smoothstep(0.5, 0.05, d));
        }`,
    });
    const puntos = new THREE.Points(geo, mat);
    puntos.renderOrder = -10;   // detrás de todo
    escena.add(puntos);
    return { puntos, sigue: 1 - (1 - capa.sigue) * PARALAJE_CIELO };
  });
  // ── El fondo de nebulosa (nmw5o26vdtit): una esfera enorme por dentro, centrada en la cámara, con una nebulosa suave y
  // procedural (ruido de valor en 3D sobre la DIRECCIÓN, así que no tiene costuras ni polos y es el mismo fondo mire donde
  // mire la cámara: adelante, atrás, a los lados o arriba). Los tonos son los del fondo de la animación de la línea del
  // proyecto (azul noche con índigo, un toque de violeta y de cian muy tenue). Determinista: la semilla es una constante
  // del shader y no hay azar de verdad. No se anima, así que con movimiento reducido es igual.
  const NEBULOSA_SEMILLA = 7.31;
  const NEBULOSA_RADIO = 500;   // dentro del plano lejano de la cámara (600) y más allá de las capas de estrellas
  // Cuánto del tono de las nubes toma el arcoíris de las nebulosas reales (nmw753vdutit): poco, para que solo se adivine
  const NEBULOSA_ARCOIRIS = 0.3;
  const nebulosa = new THREE.Mesh(
    new THREE.SphereGeometry(NEBULOSA_RADIO, 48, 32),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
      defines: { OCTAVAS: movil ? 3 : 5 },
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        varying vec3 vDir;
        float azar(vec3 p) { p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419)); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
        float ruido(vec3 x) {
          vec3 i = floor(x), f = fract(x);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(azar(i), azar(i + vec3(1.0, 0.0, 0.0)), f.x), mix(azar(i + vec3(0.0, 1.0, 0.0)), azar(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
                     mix(mix(azar(i + vec3(0.0, 0.0, 1.0)), azar(i + vec3(1.0, 0.0, 1.0)), f.x), mix(azar(i + vec3(0.0, 1.0, 1.0)), azar(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z);
        }
        float nube(vec3 p) {
          float suma = 0.0, amp = 0.5;
          for (int k = 0; k < OCTAVAS; k++) { suma += amp * ruido(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); amp *= 0.5; }
          return suma;
        }
        void main() {
          vec3 d = normalize(vDir);
          vec3 p = d * 2.4 + vec3(${NEBULOSA_SEMILLA.toFixed(2)});
          float a = nube(p);
          float b = nube(p * 1.7 + vec3(5.2, 1.3, 8.1) + a * 1.6);
          float denso = smoothstep(0.38, 0.82, b);
          float velo = smoothstep(0.30, 0.75, a);
          vec3 base = vec3(0.039, 0.051, 0.094);                              // #0a0d18, el fondo de siempre
          vec3 indigo = vec3(0.13, 0.16, 0.38), violeta = vec3(0.36, 0.28, 0.62), cian = vec3(0.10, 0.30, 0.46);
          vec3 tinte = mix(indigo, violeta, smoothstep(0.35, 0.75, nube(p * 0.6 + vec3(11.0))));
          tinte = mix(tinte, cian, 0.55 * smoothstep(0.5, 0.8, nube(p * 0.8 + vec3(23.0))));
          // Un arcoíris muy tenue, con los colores de las nebulosas reales (nota de voz del titular nmw753vdutit): el rosa del
          // hidrógeno (H-alfa), el turquesa del oxígeno (O III), el ámbar del polvo y el azul de las de reflexión, en manchas
          // muy grandes que cambian despacio de una a otra. Solo tiñe las nubes que ya había, sin sumar brillo, para que el
          // fondo no compita con lo que está delante
          vec3 rosa = vec3(0.56, 0.20, 0.36), turquesa = vec3(0.12, 0.44, 0.44), ambar = vec3(0.52, 0.36, 0.16), azul = vec3(0.18, 0.28, 0.62);
          float h = nube(p * 0.45 + vec3(31.0));
          vec3 arcoiris = mix(mix(rosa, ambar, smoothstep(0.30, 0.48, h)), mix(turquesa, azul, smoothstep(0.55, 0.72, h)), smoothstep(0.44, 0.60, h));
          tinte = mix(tinte, arcoiris, ${NEBULOSA_ARCOIRIS.toFixed(2)});
          vec3 color = base + tinte * (0.34 * denso + 0.16 * velo) * (0.55 + 0.45 * a);
          gl_FragColor = vec4(color, 1.0);
        }`,
    }),
  );
  nebulosa.renderOrder = -20;   // lo primero que se dibuja, detrás de todo
  nebulosa.frustumCulled = false;
  escena.add(nebulosa);
  // Sin suelo: bajo la línea queda un resplandor suave y muy tenue que la sostiene, sin bordes duros
  const brilloBajoLaLinea = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255, 207, 90, 0.16)'); g.addColorStop(0.5, 'rgba(255, 207, 90, 0.05)'); g.addColorStop(1, 'rgba(255, 207, 90, 0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    // Más largo hacia atrás desde que la entrada nace lejos (nmw85pz2mtit): también bajo la recta donde nace la línea
    const m = new THREE.Mesh(new THREE.PlaneGeometry(70, 560), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(0, -3, -122);
    return m;
  })();
  escena.add(brilloBajoLaLinea);

  // ── La línea del tiempo: un camino de luz que serpentea hacia adelante. Sigue más allá de la estación 2, hacia las
  // estaciones del tramo siguiente, y se pierde en la niebla
  const puntos = [];
  for (let i = 0; i <= 13; i++) puntos.push(new THREE.Vector3(Math.sin(i * 0.7) * 7 + (i % 3 - 1) * 1.5, 0.6 + Math.sin(i * 0.45) * 1.1, -i * 28));
  const camino = new THREE.CatmullRomCurve3(puntos, false, 'centripetal');
  // La línea termina en el libro abierto de «La documentación», la última estación (nmw76f854tit): se dibuja solo hasta
  // FIN_LINEA, el lugar de esa estación (SITIO[3]), y ahí entra en sus páginas
  const FIN_LINEA = 0.922;
  // Antes de 0, la línea sigue recta hacia atrás, por donde nace (la entrada, nmw85pz2mtit): u negativo es esa recta
  const LARGO_LINEA = camino.getLength(), NACE_P = camino.getPointAt(0), NACE_T = camino.getTangentAt(0);
  const puntoEn = (u) => u >= 0 ? camino.getPointAt(Math.min(u, 1)) : NACE_P.clone().addScaledVector(NACE_T, u * LARGO_LINEA);
  const tangenteEn = (u) => camino.getTangentAt(tope(u));
  const PARADA = [0.1, 0.42, 0.7, 0.9];   // dónde se detiene la cámara en cada estación (de 0 a 1); la última, «La documentación»
  // Los anillos dorados: ARCO_ANTES, cuánto antes de su parada va el de llegada
  const ARCO_RADIO = 4.2, ARCO_ANTES = 0.035;
  // Cuánto se aleja la cámara en una pantalla angosta para que una estación quepa a lo ancho (colocar › alejarPorAncho)
  const ANCHO_VISTA = 0.62, ALEJAR_MAX = 2.2;
  // La entrada (nmw84xwcrtit, nmw85pz2mtit): la cámara nace lejos al frente de la línea (U_NACE), cruza sus tres anillos y,
  // ya en U_SALE, pasado el último, se abre a la vista de costado de la estación 1
  const { nace: U_NACE, anillos: ANILLOS_ENTRADA } = entradaDeAnillos(PARADA, ARCO_ANTES);
  const U_SALE = 0.09;
  const INICIO_LINEA = U_NACE - 0.02;
  const trazo = new THREE.CatmullRomCurve3(Array.from({ length: 201 }, (_, k) => puntoEn(INICIO_LINEA + (k / 200) * (FIN_LINEA - INICIO_LINEA))), false, 'centripetal');
  escena.add(new THREE.Mesh(new THREE.TubeGeometry(trazo, 1400, 0.11, 10, false), new THREE.MeshBasicMaterial({ color: LINEA })));
  const halo = new THREE.MeshBasicMaterial({ color: LINEA, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false });
  escena.add(new THREE.Mesh(new THREE.TubeGeometry(trazo, 700, 0.34, 10, false), halo));

  const ARRIBA = new THREE.Vector3(0, 1, 0);
  const marco = (u) => {   // dónde está la línea en u, hacia dónde va y cuál es su costado
    const p = puntoEn(u), t = tangenteEn(u);
    const lado = new THREE.Vector3(-t.z, 0, t.x).normalize();
    return { p, t, lado };
  };
  // Dónde está lo que se ve en cada estación: un poco más adelante, para que la cámara lo vea de frente y no encima
  const SITIO = PARADA.map((u) => u + 0.022);
  const focos = [];   // lo que mira la cámara en cada estación
  const animar = [];  // lo que se mueve: funciones (t) => void
  // Lo que cambia con la distancia a la cámara (el emblema de la estación 1): cada cuadro, después de colocarla, también con
  // movimiento reducido, porque no se anima solo: sigue a la cámara
  const segunLejania = [];
  // El reloj de cada estación: ninguna se anima hasta que se oprime «Empieza el recorrido», y un clic en una estación del
  // menú vuelve a empezar la suya, para repetirla cuando se quiera (nota de voz nmw1khrketit). null: aún no empieza
  const relojes = [null, null, null, null];
  const empezarEstacion = (k) => { if (k >= 0 && k < relojes.length) relojes[k] = performance.now() / 1000; };
  // El video empieza el ciclo de la estación 1 en el segundo que pide, para que se vea al director hablar con el modelo
  ganchoVideo.estacion1 = (seg) => { relojes[0] = performance.now() / 1000 - seg; };
  const tiempoDe = (k) => relojes[k] === null ? 0 : performance.now() / 1000 - relojes[k];
  // Lo que se mueve en una estación corre con su propio reloj, no con el de la página
  const deEstacion = (k, f) => () => f(compartir ? MOMENTO_COMPARTIR : tiempoDe(k));
  const azar = (a, b) => a + Math.random() * (b - a);

  // Un rótulo flotante: texto sobre una píldora, siempre de frente a la cámara
  // En un teléfono, los rótulos de la estación 1 crecen «telefono» veces, para leerse con la cámara alejada (t_decide_estacion1_rotulos,
  // nota de voz del titular nmw88lkhftit); los demás pasan 1
  function rotulo(texto, color = LUZ, alto = 0.6, telefono = 2.2) {
    if (movil) alto *= telefono;
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
    // Su emblema (pd_estaciones_decoradas; el emblema por estación, nmw5eregptit): los tres actores que ya están, con un
    // halo suave y dorado detrás de los tres. Desde lejos (la entrada, o al volver de la
    // estación 2) se ve chico y tenue, y crece a la vista al acercarte; al llegar, entero. Sin niebla, para que se vea de lejos
    const CENTRO_EMBLEMA = enLinea(0).addScaledVector(ARRIBA, 5).addScaledVector(lado, -5);
    const EMBLEMA_HALO = 44, EMBLEMA_CERCA = 36, EMBLEMA_LEJOS = 80;
    const haloEmblema = (() => {
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const x = c.getContext('2d'), g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
      g.addColorStop(0, 'rgba(255, 214, 140, .22)'); g.addColorStop(0.45, 'rgba(255, 214, 140, .08)'); g.addColorStop(1, 'rgba(255, 214, 140, 0)');
      x.fillStyle = g; x.fillRect(0, 0, 256, 256);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      return new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    })();
    haloEmblema.position.copy(CENTRO_EMBLEMA);
    haloEmblema.renderOrder = -5;   // detrás de los actores, delante del cielo
    // Sin su nombre flotando sobre el Studio: el rótulo «STL Studio» de abajo ya lo dice (nota de voz nmw766nyutit)
    escena.add(haloEmblema);
    segunLejania.push(() => {
      const lejos = lejania(camara.position.distanceTo(CENTRO_EMBLEMA), EMBLEMA_CERCA, EMBLEMA_LEJOS);
      const crece = lerp(1, 0.55, lejos);
      haloEmblema.scale.setScalar(EMBLEMA_HALO * crece);
      haloEmblema.material.opacity = lerp(1, 0.5, lejos);
    });

    const mitad = enLinea(0).addScaledVector(ARRIBA, 5);
    portada = {
      posicion: mitad.clone().addScaledVector(lado, 34).addScaledVector(ARRIBA, 0.8),
      mira: mitad.clone().addScaledVector(ARRIBA, 0.3),
      lado,
    };
    focos.push(centro.clone().addScaledVector(ARRIBA, -3));
  }

  // ── El camino entre la estación 1 y la 2: solo la línea del tiempo, que late despacio. Sin las esferas de colores que
  // salían de ella en arcos (nota de voz nmw76cwtctit), ni los postes con su farol de antes (nmw17rx07tit)
  animar.push((t) => {
    halo.opacity = 0.18 + 0.08 * Math.sin(t * 1.2) ** 2;
  });

  // La estación 2: cuánto está abierto el reproductor de un problema (cam, de 0 a 1, suavizado), que lleva el anillo hacia el
  // menú y lo achica para dejarle sitio
  const pantalla2 = { cam: 0, abierta: false };
  // El anillo de íconos de la estación 2: su centro, su costado y su dirección; lo llena la estación
  const anillo = { centro: null, lado: null, tan: null, escala: 1 };
  // La pantalla 3D de «Cómo empezar» y su brillo (los pone la estación 3), y si el reproductor se está encogiendo hacia ella
  const como3d = { pantalla: null, brillo: null, volviendo: false, linea: null, figura: null };
  // Las tres referencias de la estación 3 con sus rótulos, en un grupo que se aparta del menú (apartarColumna, nmw6z8b3btit)
  const columnaComo = new THREE.Group();
  escena.add(columnaComo);

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
    // Su centro, a la altura de la cámara (2,8 sobre la línea, como en pose): así el anillo queda al centro de la vista con la
    // mirada nivelada, y al irse de la estación la cámara pasa por el hueco del anillo, sin bajar la mirada para encuadrarlo
    // (nota de voz del titular nmw6lcanstit, 7 de noviembre de 2026)
    Object.assign(anillo, { centro: p.clone().addScaledVector(ARRIBA, ALTURA_CAMARA), lado, tan: t });
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
    const gris = new THREE.Color(GRIS_PROBLEMA), tono = new THREE.Color();
    // Desde lejos, el anillo va en sus siete colores, y al llegar a la estación se vuelve gris hasta que abres cada uno
    // (t_decide_anillo_lejos, nmw74wypntit): desde la línea se ve algo de color esperando, y de cerca nada cambia. La cámara
    // se detiene a unos 16 de su centro
    const COLOR_CERCA = 22, COLOR_LEJOS = 48;
    // Cada cuadro: el anillo gira, y con el reproductor abierto se achica (sus íconos, un poco menos) para dejarle sitio. Cada
    // ícono va en gris hasta que el ratón pasa por él o se abre, y entonces toma su color (nmw46qjootit)
    function moverAnillo(s) {
      const abierto = suave(pantalla2.cam);
      anillo.escala = lerp(1, ANILLO_ABIERTO, abierto);
      const deLejos = lejania(camara.position.distanceTo(anillo.centro), COLOR_CERCA, COLOR_LEJOS);
      orbes.forEach((o, i) => {
        const visto = enColor(i, sobre, seleccionado, resueltos);
        if (visto) tono.copy(o.color); else tono.copy(gris).lerp(o.color, deLejos);
        o.mat.color.lerp(tono, quieto ? 1 : 0.15); o.mat.emissive.lerp(tono, quieto ? 1 : 0.15);
        o.grande += ((seleccionado === i ? 1.25 : sobre === i ? 1.12 : 1) - o.grande) * (quieto ? 1 : 0.12);
        o.orbe.scale.setScalar(o.grande * ESCALA_ICONO * lerp(1, 0.78, abierto));
        lugarEnAnillo(o.a + s * GIRO_ANILLO, anillo.escala, o.casa);
        o.orbe.position.copy(o.casa).addScaledVector(ARRIBA, Math.sin(s * 1.4 + o.fase) * 0.1);
        o.orbe.rotation.y = frente + Math.sin(s * 0.9 + o.fase) * 0.4;
        o.mat.emissiveIntensity = visto ? 0.55 : lerp(0.15 + 0.15 * Math.sin(s * 2 + o.fase) ** 2, 0.55, deLejos);
      });
    }
    anillo.mover = moverAnillo;
    animar.push(deEstacion(1, moverAnillo));
    // La cámara mira el centro del anillo
    focos.push(anillo.centro.clone());
  }

  // ── Estación 3, «Cómo empezar» (pd_como_empezar): el camino de la 2 a la 3 es la línea sola, como el de la 1 a la 2 pero
  // sin notas que viajan (nmw4isvr9tit); al llegar, su reproductor se abre a la izquierda y la línea queda a la derecha
  // (nmw4ircrjtit), pero solo cuando el visitante oprime «▶ Ver cómo empezar» (nmw5wbs86tit). La cámara mira la línea, al
  // frente. Sus elementos están siempre, antes de llegar y después de irse, aunque el reproductor esté cerrado
  {
    const u = SITIO[2];
    const { p, t, lado } = marco(u);
    focos.push(p.clone().addScaledVector(ARRIBA, 0.9));
    // La escena de instalar (nota de voz del titular nmw5wbs86tit, 7 de noviembre de 2026: nada que orbite solo porque sí,
    // sino lo que se va a presentar ahí): a la izquierda de la línea, la pantalla flotante donde se verá «Cómo empezar»,
    // grande, con su marco de luz y su ▶, que se ve desde lejos; a la derecha, la descarga: un haz de luz que baja del cielo
    // y deja el paquete del Studio sobre su base, junto a una carpeta abierta; y entre las dos, sobre la línea, la barra
    // de la instalación que se llena. Nada pasa por donde va la cámara, y la animación de la pantalla empieza solo con un clic
    const frente3 = Math.atan2(-t.x, -t.z);   // de frente a la cámara, que llega por detrás
    const cajita3 = (w, h, d, material, r = 0.05) => new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), material);
    const enEscena = (obj, ladoX, alto, adelante = 0) => {
      obj.position.copy(p).addScaledVector(lado, ladoX).addScaledVector(ARRIBA, alto).addScaledVector(t, adelante);
      obj.rotation.y = frente3;
      escena.add(obj);
      return obj;
    };
    // 1 · La pantalla flotante, más chica (nmw6lwwbxtit): un panel oscuro con su marco cian y el ▶ dorado en el centro. Es la
    // misma pantalla de «Cómo empezar»: con «▶ Ver cómo empezar», el reproductor crece desde ella y ella se apaga; al irse de
    // la estación, el reproductor se encoge de vuelta hacia ella y ella vuelve (como3d, abrirComo, cerrarPopup)
    const pantallaComo = new THREE.Group();
    const marcoLuz = cajita3(3.3, 2, 0.06, brillo(CIAN, 0.9), 0.1);
    const panel = cajita3(3.12, 1.82, 0.1, new THREE.MeshStandardMaterial({ color: '#0b0f1c', roughness: 0.6 }), 0.08);
    panel.position.z = 0.03;
    const triangulo = new THREE.Shape();
    triangulo.moveTo(-0.24, -0.32); triangulo.lineTo(0.38, 0); triangulo.lineTo(-0.24, 0.32); triangulo.closePath();
    const play = new THREE.Mesh(new THREE.ExtrudeGeometry(triangulo, { depth: 0.06, bevelEnabled: false }), brillo(ORO, 0.9));
    // El ▶, chico en la esquina de abajo a la derecha: el centro es del bucle de la instalación (nmw6xq68htit), y no lo tapa
    play.scale.setScalar(0.42);
    play.position.set(1.32, -0.66, 0.09);
    // El bucle, en un lienzo que cubre el panel por dentro del marco (pintarBucleInstalar), y la pantalla de pie: su
    // poste y su base, debajo de ella, sin tocar la línea ni las referencias (nmw5ernpstit)
    const lienzoBucle = document.createElement('canvas');
    lienzoBucle.width = 640; lienzoBucle.height = 372;
    const ctxBucle = lienzoBucle.getContext('2d');
    const texturaBucle = new THREE.CanvasTexture(lienzoBucle);
    texturaBucle.colorSpace = THREE.SRGBColorSpace;
    const pantallaBucle = new THREE.Mesh(new THREE.PlaneGeometry(2.96, 1.72), new THREE.MeshBasicMaterial({ map: texturaBucle, toneMapped: false }));
    pantallaBucle.position.z = 0.086;
    const dibujarBucle = (s) => {
      if (!ctxBucle) return 0;
      ctxBucle.setTransform(2, 0, 0, 2, 0, 0);
      const k = pintarBucleInstalar(ctxBucle, s);
      texturaBucle.needsUpdate = true;
      return k;
    };
    dibujarBucle(quieto ? BUCLE_SEG * (BUCLE_TIEMPOS - 1) + BUCLE_SEG - 0.01 : 0);
    const pieDePantalla = cajita3(0.14, 1.32, 0.14, new THREE.MeshStandardMaterial({ color: '#2a3350', roughness: 0.5 }), 0.05);
    pieDePantalla.position.set(0, -1.66, -0.04);
    const base = cajita3(1.1, 0.08, 0.6, brillo(CIAN, 0.35), 0.03);
    base.position.set(0, -2.32, -0.04);
    pantallaComo.add(marcoLuz, panel, pantallaBucle, play, pieDePantalla, base);
    enEscena(pantallaComo, -3.4, 2.4, 0.6);
    const brilloPantalla = resplandor('90, 209, 255', CIAN, 6).halo;
    brilloPantalla.material.opacity = 0.4;
    brilloPantalla.position.copy(pantallaComo.position).addScaledVector(t, 0.4);
    escena.add(brilloPantalla);
    Object.assign(como3d, { pantalla: pantallaComo, brillo: brilloPantalla });
    // 2 · Tres referencias pequeñas a la instalación, en columna a la derecha de la línea, con aire entre ellas y lejos de la
    // pantalla (nmw6lwwbxtit): arriba, la flecha de la descarga; al medio, la carpeta donde queda el Studio; abajo, la
    // terminal con su cursor. Ninguna se toca con otra ni con la pantalla
    const COLUMNA = 3.4;
    // Las tres, con sus rótulos, van juntas en un grupo que se corre entero si quedan detrás del menú (apartarColumna)
    const enColumna = (obj) => { columnaComo.add(obj); return obj; };
    const flecha = new THREE.Group();
    const astil = cajita3(0.16, 0.42, 0.12, brillo(CIAN, 0.7), 0.04); astil.position.y = 0.16;
    const formaPunta = new THREE.Shape();
    formaPunta.moveTo(-0.27, 0); formaPunta.lineTo(0.27, 0); formaPunta.lineTo(0, -0.32); formaPunta.closePath();
    const punta = new THREE.Mesh(new THREE.ExtrudeGeometry(formaPunta, { depth: 0.12, bevelEnabled: false }), brillo(CIAN, 0.7));
    punta.position.set(0, -0.04, -0.06);
    const bandeja = cajita3(0.62, 0.08, 0.14, brillo('#ffffff', 0.35), 0.03); bandeja.position.y = -0.44;
    flecha.add(astil, punta, bandeja);
    const TAM_REFERENCIA = 1.35;
    flecha.scale.setScalar(TAM_REFERENCIA);
    enColumna(enEscena(flecha, COLUMNA, 4.2));
    // Para correrla sobre la línea si toca el menú (apartarColumna): el punto de la línea en la estación y la figura de arriba
    Object.assign(como3d, { linea: p.clone(), figura: flecha });
    const carpeta = new THREE.Group();
    const solapa = cajita3(0.3, 0.1, 0.12, brillo(ORO, 0.5), 0.03);
    solapa.position.set(-0.17, 0.27, 0);
    carpeta.add(cajita3(0.72, 0.48, 0.12, brillo(ORO, 0.4), 0.05), solapa);
    carpeta.scale.setScalar(TAM_REFERENCIA);
    enColumna(enEscena(carpeta, COLUMNA, 2.6));
    const terminal = new THREE.Group();
    const bordeTerminal = cajita3(0.86, 0.58, 0.06, brillo(CIAN, 0.45), 0.06); bordeTerminal.position.z = -0.03;
    terminal.add(bordeTerminal, cajita3(0.8, 0.52, 0.1, plano('#222a44', 0.95), 0.05));
    terminal.scale.setScalar(TAM_REFERENCIA);
    const prompt = cajita3(0.14, 0.05, 0.04, brillo(VERDE, 0.8), 0.015); prompt.position.set(-0.24, 0.02, 0.06);
    const cursor = cajita3(0.08, 0.12, 0.04, brillo(VERDE, 0.9), 0.015); cursor.position.set(-0.06, 0.02, 0.06);
    terminal.add(prompt, cursor);
    enColumna(enEscena(terminal, COLUMNA, 1));
    // Un rótulo a la derecha de cada referencia (como los de la estación 1, en el idioma de la página): empieza pasado el
    // borde de la figura (0,8 desde su centro), a su altura, así que no toca la figura ni a las otras (hay 1,6 entre ellas)
    for (const [texto, color, y] of [[T.descargalo, CIAN, 4.2], [T.tuCarpeta, ORO, 2.6], [T.pideAgente, VERDE, 1]]) {
      const r = rotulo(texto, color, 0.45, 1);
      enColumna(enEscena(r, COLUMNA + 0.8 + r.scale.x / 2, y));
      r.rotation.y = 0;
    }
    // La flecha baja y sube despacio hacia su bandeja, la carpeta respira y el cursor parpadea; nada sale de su lugar
    // Mientras corre el bucle de la pantalla, la referencia que nombra se enciende un poco más (sin moverse ni crecer)
    let cuadroBucle = -1, tiempoBucle = 0;
    function moverEscenaComo(s) {
      const cuadro = Math.floor(s * 15);
      if (cuadro !== cuadroBucle) { cuadroBucle = cuadro; tiempoBucle = dibujarBucle(s); }
      const luz = (k) => (tiempoBucle === k ? 0.45 : 0);
      flecha.position.y = terminal.position.y + 3.2 - 0.08 * (1 + Math.sin(s * 1.6));
      for (const parte of [astil, punta]) parte.material.emissiveIntensity = 0.7 + luz(0);
      carpeta.children[0].material.emissiveIntensity = 0.4 + 0.15 * Math.sin(s * 1.2) + luz(1);
      bordeTerminal.material.emissiveIntensity = 0.45 + luz(2);
      cursor.visible = Math.sin(s * 5) > -0.2;
      play.material.emissiveIntensity = 0.6 + 0.3 * Math.sin(s * 2);
    }
    animar.push(deEstacion(2, moverEscenaComo));
  }

  // ── Estación 4, «La documentación» (pd_pagina_unica): su emblema es un libro abierto, dorado y blanco, con un halo suave
  // (nmw6zaitctit), y la línea del tiempo termina en él: su último tramo entra por el lomo entre las dos páginas
  // (nmw76f854tit). Echado sobre la línea, con el lomo en su dirección, de frente a la cámara que llega; sin voz
  // (nmw3s6d7ktit). Su tarjeta de texto se abre a la izquierda con su «▶» (mundo-3d.html, #documentacion)
  {
    const u = SITIO[3];
    const { p, t } = marco(u);
    const libro = new THREE.Group();
    const caja4 = (w, h, d, material, r = 0.04) => new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), material);
    const LARGO_LIBRO = 2.4, ANCHO_HOJA = 1.7;
    const tapaMat = brillo(ORO, 0.55), hojaMat = brillo('#fffaf0', 0.5), renglonMat = brillo(ORO, 0.35);
    const lomo = caja4(0.18, 0.12, LARGO_LIBRO + 0.16, tapaMat, 0.05);
    libro.add(lomo);
    for (const costado of [-1, 1]) {
      // Cada mitad, un poco levantada desde el lomo, como un libro abierto sobre la mesa: su tapa y su hoja, y unos renglones
      const mitad = new THREE.Group();
      const tapa = caja4(ANCHO_HOJA + 0.12, 0.06, LARGO_LIBRO + 0.16, tapaMat);
      const hoja = caja4(ANCHO_HOJA, 0.08, LARGO_LIBRO, hojaMat, 0.03);
      tapa.position.set(costado * (ANCHO_HOJA + 0.12) / 2, -0.02, 0);
      hoja.position.set(costado * ANCHO_HOJA / 2, 0.05, 0);
      mitad.add(tapa, hoja);
      for (let r = 0; r < 5; r++) {
        const renglon = caja4(ANCHO_HOJA * (r === 4 ? 0.45 : 0.7), 0.02, 0.06, renglonMat, 0.01);
        renglon.position.set(costado * ANCHO_HOJA * 0.5, 0.1, -0.8 + r * 0.4);
        mitad.add(renglon);
      }
      mitad.rotation.z = costado * 0.22;
      libro.add(mitad);
    }
    // El lomo en la dirección de la línea, y su borde de atrás justo donde ella termina
    libro.rotation.y = Math.atan2(t.x, t.z);
    libro.position.copy(p).addScaledVector(t, LARGO_LIBRO / 2 - 0.1).addScaledVector(ARRIBA, 0.02);
    escena.add(libro);
    const haloLibro = resplandor('255, 214, 140', ORO, 9).halo;
    haloLibro.material.opacity = 0.55;
    haloLibro.position.copy(libro.position).addScaledVector(ARRIBA, 0.4);
    haloLibro.renderOrder = -5;
    escena.add(haloLibro);
    focos.push(libro.position.clone().addScaledVector(ARRIBA, 0.9));
    // Solo el halo respira, despacio; el libro no se mueve
    animar.push(deEstacion(3, (s) => { haloLibro.material.opacity = 0.45 + 0.12 * Math.sin(s * 1.1) ** 2; }));
  }

  // ── Un anillo en cada parada desde la 2 (pd_estaciones_decoradas; nmw6z9v94tit, y nmw727omntit: «make them full rings,
  // remove the first one, add them some glow»): un anillo dorado y delgado alrededor de la línea, unos metros antes de cada
  // estación, que la cámara cruza al llegar, como una puerta que dice «estás llegando». La estación 1 no lo lleva: el
  // recorrido empieza ahí y no pasa por él. Ancho y alto de sobra: la cámara pasa a 1,4 del centro de la línea y a 2,8 de
  // altura (unos 3,1 del centro del anillo), y el anillo mide 4,2 de radio, así que nada cruza la vista. Quieto, sin animación.
  // Desde nmw74wypntit, tres por tramo, a la misma distancia (lugaresDeAnillos): dos en el camino y el de la llegada
  // Un círculo entero hecho tubo, en el plano de su costado y arriba, con su halo: un tubo más grueso, tenue y aditivo
  const circulo = Array.from({ length: 72 }, (_, k) => new THREE.Vector3(Math.cos((k / 72) * Math.PI * 2) * ARCO_RADIO, Math.sin((k / 72) * Math.PI * 2) * ARCO_RADIO, 0));
  const formaArco = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(circulo, true), 144, 0.05, 8, true);
  const formaHaloArco = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(circulo, true), 144, 0.24, 8, true);
  const materialArco = brillo(ORO, 0.9);
  const materialHaloArco = new THREE.MeshBasicMaterial({ color: ORO, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false });
  // Y tres antes de la estación 1, en el trecho donde nace la línea (nota de voz del titular nmw84xwcrtit, 8 de noviembre de
  // 2026): el recorrido empieza parado al frente de la línea, con el primero a la vista, y la cámara los cruza hacia «Qué es
  // STL» antes de abrirse a la vista de costado de la estación
  // En un teléfono, la cámara se aleja en cada parada para que la estación quepa a lo ancho (alejarPorAncho) y se detenía
  // antes del anillo de llegada, que tapaba la estación (nota de voz del titular nmw87ytm7tit): ahí el de llegada va antes
  // de donde queda la cámara ya alejada, con 3 de aire, así la cámara siempre lo pasa
  const antesDeLlegar = (() => {
    if (!movil) return ARCO_ANTES;
    const w = innerWidth, h = Math.max(innerHeight, 1), fov = THREE.MathUtils.degToRad(w < h ? 68 : 55);
    const alejar = tope((ANCHO_VISTA / (Math.tan(fov / 2) * (w / h)) - 1) / (ALEJAR_MAX - 1)) * (ALEJAR_MAX - 1) + 1;
    const s = 0.022 * LARGO_LINEA;   // de la parada a lo que mira (SITIO)
    return Math.max(ARCO_ANTES, ((7.5 + s) * alejar - s + 3) / LARGO_LINEA);
  })();
  for (const u of [...ANILLOS_ENTRADA, ...lugaresDeAnillos(PARADA, antesDeLlegar)]) {
    const { p, lado } = marco(u);
    const hacia = new THREE.Vector3().crossVectors(lado, ARRIBA).normalize();
    const arco = new THREE.Group();
    arco.add(new THREE.Mesh(formaArco, materialArco), new THREE.Mesh(formaHaloArco, materialHaloArco));
    arco.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(lado, ARRIBA, hacia));
    arco.position.copy(p);
    escena.add(arco);
  }

  // ── La cámara: arriba, parada al frente de la línea, donde nace, con el primer anillo a la vista y el recorrido tenue al
  // fondo (nmw84v293tit, nmw84xwcrtit; igual en el computador y en el teléfono); al bajar, avanza por la línea cruzando los
  // anillos de la entrada y se abre a la vista de costado de la estación 1; después se mete en la línea y la sigue
  const masSuave = (x) => x * x * x * (x * (6 * x - 15) + 10);   // lenta al llegar y al salir de cada estación
  const pose = (u) => {
    const { p, t, lado } = marco(u);
    const posicion = p.clone().addScaledVector(t, -7.5).addScaledVector(ARRIBA, ALTURA_CAMARA).addScaledVector(lado, 1.4);
    const adelante = puntoEn(Math.min(u + 0.03, 1)).addScaledVector(ARRIBA, 0.9);
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
  // Cuánto alejar la cámara para que una estación quepa a lo ancho: el ancho que se ve (la tangente de la mitad del campo
  // horizontal) frente al de un computador, ANCHO_VISTA; en un computador, 1, y nada cambia
  const alejarPorAncho = () => tope((ANCHO_VISTA / (Math.tan(THREE.MathUtils.degToRad(camara.fov) / 2) * camara.aspect) - 1) / (ALEJAR_MAX - 1)) * (ALEJAR_MAX - 1) + 1;
  // La parada suave de un teléfono (nmw84zgrttit): un punto invisible en el centro de cada estación, donde se detiene la
  // cámara, que el desplazamiento busca al terminar cerca de él y que un movimiento rápido no se salta (mundo-3d.html ›
  // .parada-suave); entre estaciones, el dedo se mueve libre
  if (movil) estaciones.forEach((el) => { const m = document.createElement('span'); m.className = 'parada-suave'; m.setAttribute('aria-hidden', 'true'); el.append(m); });
  // El problema abierto (−1, ninguno) y el que está bajo el ratón. Al abrir uno, la cámara no se mueve: el recuadro lo
  // tapaba y el acercamiento la dejaba pegada a la estación 2 (t_decide_acercar_problema, nota nmw19elcqtit)
  let seleccionado = -1, sobre = -1;
  // La entrada: dónde la cámara (7,5 detrás de su punto de la línea) ya cruzó el tercer anillo, con 1,5 de aire; si eso cae
  // más allá de U_SALE, la entrada llega hasta ahí. W_CRUCE es el w de ese punto (masSuave se invierte por bisección)
  const U_CRUCE = ANILLOS_ENTRADA[ANILLOS_ENTRADA.length - 1] + 9 / LARGO_LINEA;
  const U_SALE_ENTRADA = Math.max(U_SALE, U_CRUCE + 0.004);
  const W_CRUCE = (() => {
    const meta = (U_CRUCE - U_NACE) / (U_SALE_ENTRADA - U_NACE);
    let a = 0, b = 1;
    for (let n = 0; n < 40; n++) { const m = (a + b) / 2; if (masSuave(m) < meta) a = m; else b = m; }
    return Math.min(0.9, (a + b) / 2);
  })();
  let giroEntrada = 1;
  function colocar(w) {
    let posicion, mira;
    if (w < 1) {
      // De 0 a 1: avanza por la línea desde donde nace hasta pasar el último anillo de la entrada, y en la segunda mitad se
      // abre a la vista de costado de la estación 1 (el espejo de la salida de la estación 1, k === 1)
      // Desde que la entrada nace mucho más atrás (nmw85pz2mtit), se abre más tarde, en el último cuarto: antes cruza los anillos
      // Y solo se abre después de cruzar el tercer anillo (nota de voz del titular nmw87ytm7tit): W_CRUCE es donde la cámara
      // ya lo pasó; de ahí al final, la vista de costado
      const e = masSuave(tope(w));
      ({ posicion, mira } = pose(lerp(U_NACE, U_SALE_ENTRADA, e)));
      const b = masSuave(tope((w - W_CRUCE) / (1 - W_CRUCE)));
      posicion.lerp(portada.posicion, b);
      mira.lerp(portada.mira, b);
      giroEntrada = b;
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
    // En una pantalla angosta (un teléfono o una tableta de pie), cada estación cabe a lo ancho (pd_telefono_vertical, pieza 2):
    // cerca de su parada, la cámara se aleja de lo que mira lo que le falta de ancho; entre estaciones, va por la línea
    const k = Math.round(w), ancho = alejarPorAncho();
    if (ancho > 1 && k >= 1) {
      // Llegando a la estación 1, se aleja solo mientras se abre a la vista de costado: antes, alejarse la devolvía detrás del
      // tercer anillo que acababa de cruzar (nmw87ytm7tit)
      const cerca = suave(tope(1 - Math.abs(w - k) / 0.5)) * (w < 1 ? giroEntrada : 1);
      posicion = mira.clone().lerp(posicion, 1 + (ancho - 1) * cerca);
    }
    camara.position.copy(posicion);
    const ojo = sinMirarAbajo(posicion, mira);
    camara.lookAt(ojo.x, ojo.y, ojo.z);
    farol.position.copy(posicion).addScaledVector(ARRIBA, 1.5);
    encuadrarDos(w);
    apartarColumna();
  }

  // ── El encuadre de la estación 2 (nota de voz nmw40cp3jtit): la cámara no se mueve, pero la imagen se corre
  // (setViewOffset) para que el anillo quede en el centro de lo que deja libre el menú, y con un reproductor abierto, pegado
  // al menú, con el reproductor en todo lo que queda a su izquierda (disponerReproductor). Lejos de la estación 2, nada se corre
  const MANDOS_ALTO = 64;   // lo que ocupan los mandos, debajo de la animación, dentro del reproductor
  const menuLista = document.querySelector('.menu ol'), lineaDos = document.querySelector('[data-titulo-dos]')?.closest('.tarjeta');
  const enPantalla = new THREE.Vector3();
  // Dónde queda arriba una tarjeta, sin lo que se está deslizando al aparecer (nmw6p0g7htit): el encuadre no se mueve con ella
  const arribaDe = (el) => { const r = el?.getBoundingClientRect(); if (!r || !r.height) return null; const t = getComputedStyle(el).transform; return r.top - (t && t !== 'none' ? new DOMMatrixReadOnly(t).m42 : 0); };
  const aPantalla = (v, ancho, alto, cam = camara) => { enPantalla.copy(v).project(cam); return { x: (enPantalla.x + 1) / 2 * ancho, y: (1 - enPantalla.y) / 2 * alto }; };
  // Al irse de la estación 2 hacia la 3, el anillo queda debajo y detrás de la cámara: medido con la cámara de ahora, su
  // centro se iba al fondo de la pantalla y el encuadre corría la imagen hacia abajo, como si la cámara mirara el suelo, y
  // luego la subía (nota de voz del titular nmw5w9ldotit, 7 de noviembre de 2026). Pasada la estación, el encuadre se mide con
  // la cámara quieta en la estación 2 y solo se apaga: la mirada sigue al frente, como caminando sobre la línea
  // Lo mismo al irse de la estación 3 hacia la 4 (nota de voz del titular nmw84v293tit, 8 de noviembre de 2026): medido con
  // la cámara que avanza, «Cómo empezar» se iba de lado, el encuadre corría la imagen y la cámara parecía girar rápido a la
  // izquierda y seguir por otra línea. Pasada la 3, se mide desde ella, quieta (ponerCamaraEn(2))
  const camaraEnDos = new THREE.PerspectiveCamera();
  const ponerCamaraEnDos = () => ponerCamaraEn(1);
  function ponerCamaraEn(i) {
    camaraEnDos.copy(camara);
    camaraEnDos.clearViewOffset();
    const { posicion, mira } = pose(PARADA[i]);
    camaraEnDos.position.copy(posicion);
    const ojo = sinMirarAbajo(posicion, mira);
    camaraEnDos.lookAt(ojo.x, ojo.y, ojo.z);
    camaraEnDos.updateMatrixWorld();
    return camaraEnDos;
  }
  let disposicion = null;   // dónde quedan el reproductor y el anillo, para el cuadro que se dibuja
  // «Cómo empezar», en la estación 3 (nmw4ircrjtit): su reproductor a la izquierda, con la fila del ejemplo y del enlace
  // (EXTRA_ALTO) sobre sus mandos, y la línea a la derecha, donde en la 2 queda el anillo; la imagen se corre para que la
  // línea quede ahí cuando el reproductor está abierto, y al centro de lo libre cuando no
  const EXTRA_ALTO = 40;
  const lineaTres = document.querySelector('[data-titulo-tres]')?.closest('.tarjeta');
  function encuadrarTres(w, ancho, alto) {
    // Hacia la 4, se apaga en 0,4, como el de la 2 hacia la 3, y medido desde la estación 3 (nmw84v293tit)
    const cerca = suave(tope(1 - Math.abs(w - 3) / (w > 3 ? 0.4 : 0.6)));
    if (cerca <= 0.001 || !focos[2] || !ancho || !alto) return false;
    camara.updateMatrixWorld();
    const cam = w > 3 ? ponerCamaraEn(2) : camara;
    const menuIzq = movil || !menuLista ? ancho : menuLista.getBoundingClientRect().left;
    const arriba = arribaDe(lineaTres);
    const lineaArriba = arriba !== null && arriba < alto ? arriba : alto;
    const d = disponerReproductor({ ancho, alto, menuIzq, lineaArriba, anilloMedio: menuIzq * 0.12, anilloAlto: 0, mandos: MANDOS_ALTO + EXTRA_ALTO });
    const c = aPantalla(focos[2], ancho, alto, cam), e = seleccionado === GUIA ? suave(pantalla2.cam) : 0;
    camara.setViewOffset(ancho, alto, -(lerp(menuIzq / 2, d.anilloX, e) - c.x) * cerca, 0, ancho, alto);
    disposicion = { ...d, menuIzq, lineaArriba, ancho, alto };
    return true;
  }
  function encuadrarDos(w) {
    const ancho = lienzo.clientWidth, alto = lienzo.clientHeight;
    // Hacia la 3, el encuadre de la 2 se apaga antes (en 0,4) de que empiece el de la 3 (en 2,4): antes se encimaban y en 2,4
    // la imagen saltaba de un encuadre al otro (nmw6lcanstit)
    const cerca = suave(tope(1 - Math.abs(w - 2) / (w > 2 ? 0.4 : 0.6)));
    camara.clearViewOffset();
    disposicion = null;
    if (encuadrarTres(w, ancho, alto)) return;
    if (cerca <= 0.001 || !anillo.centro || !ancho || !alto) return;
    camara.updateMatrixWorld();
    // El anillo como se ve ahora, sin correrse: su centro y la mitad de su ancho y de su alto, con el aire de sus íconos;
    // pasada la estación, como se ve desde ella (ponerCamaraEnDos)
    const cam = w > 2 ? ponerCamaraEnDos() : camara;
    const c = aPantalla(anillo.centro, ancho, alto, cam);
    const ladoX = aPantalla(anillo.centro.clone().addScaledVector(anillo.lado, anillo.radioX * anillo.escala), ancho, alto, cam);
    const arribaY = aPantalla(anillo.centro.clone().addScaledVector(ARRIBA, anillo.radioY * anillo.escala), ancho, alto, cam);
    const aire = Math.max(36, alto * 0.06);
    const deAbierto = anillo.abierto / Math.max(anillo.escala, 0.01);
    const medioAncho = Math.abs(ladoX.x - c.x), medioAlto = Math.abs(arribaY.y - c.y);
    const menuIzq = movil || !menuLista ? ancho : menuLista.getBoundingClientRect().left;
    const arriba = arribaDe(lineaDos);
    const lineaArriba = arriba !== null && arriba < alto ? arriba : alto;
    const d = disponerReproductor({ ancho, alto, menuIzq, lineaArriba, anilloMedio: medioAncho * deAbierto + aire, anilloAlto: medioAlto * deAbierto + aire, mandos: MANDOS_ALTO });
    // Cerrado, el anillo va al centro de lo libre (entre el borde y el menú, y sobre la línea de abajo); abierto, junto al menú
    const e = suave(pantalla2.cam);
    const dx = lerp(menuIzq / 2, d.anilloX, e) - c.x, dy = lerp(Math.min(alto / 2, lineaArriba / 2 + 8), d.anilloY, e) - c.y;
    camara.setViewOffset(ancho, alto, -dx * cerca, corrimientoSinBajar(-dy * cerca), ancho, alto);
    disposicion = { ...d, menuIzq, lineaArriba, ancho, alto };
  }

  // ── Las referencias de «Cómo empezar» nunca quedan detrás del menú flotante (nota de voz del titular nmw6z8b3btit): en
  // cada cuadro se mide dónde caería su columna en su lugar; si ahí no toca el menú, vuelve a él (el reproductor cerrado,
  // otra estación). Si lo toca, se mide donde va ahora y se corre lo que aún pida apartarDelMenu, en el plano de la
  // pantalla y a su profundidad, hasta que ya no pide nada: así llega aunque la perspectiva no sea pareja
  const menuEntero = document.querySelector('.menu');
  const cajaColumna = new THREE.Box3(), esquina = new THREE.Vector3(), medioColumna = new THREE.Vector3();
  const corrida = new THREE.Vector3(), derechaCam = new THREE.Vector3(), arribaCam = new THREE.Vector3();
  function columnaEnPantalla(ancho, alto) {
    columnaComo.updateMatrixWorld(true);
    cajaColumna.setFromObject(columnaComo);
    const hondo = -cajaColumna.getCenter(medioColumna).applyMatrix4(camara.matrixWorldInverse).z;
    if (!(hondo > 1)) return null;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let k = 0; k < 8; k++) {
      esquina.set(k & 1 ? cajaColumna.max.x : cajaColumna.min.x, k & 2 ? cajaColumna.max.y : cajaColumna.min.y, k & 4 ? cajaColumna.max.z : cajaColumna.min.z);
      const p = aPantalla(esquina, ancho, alto);
      x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y);
    }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0, hondo };
  }
  // Cuánto correr la columna, en píxeles, para que su figura de arriba quede justo sobre la línea amarilla (nmw7160d0tit)
  const figuraEnMundo = new THREE.Vector3();
  function haciaLaLinea(ancho, alto) {
    if (!como3d.linea || !como3d.figura) return null;
    columnaComo.updateMatrixWorld(true);
    const figura = aPantalla(como3d.figura.getWorldPosition(figuraEnMundo), ancho, alto);
    return aPantalla(como3d.linea, ancho, alto).x - figura.x;
  }
  // La caja en la pantalla de otra pieza de la estación (la pantalla flotante), para no pisarla al correr la columna
  const cajaOtra = new THREE.Box3();
  function cajaEnPantalla(obj, ancho, alto) {
    if (!obj?.visible) return null;
    cajaOtra.setFromObject(obj);
    if (!(-cajaOtra.getCenter(figuraEnMundo).applyMatrix4(camara.matrixWorldInverse).z > 1)) return null;   // detrás de la cámara
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let k = 0; k < 8; k++) {
      esquina.set(k & 1 ? cajaOtra.max.x : cajaOtra.min.x, k & 2 ? cajaOtra.max.y : cajaOtra.min.y, k & 4 ? cajaOtra.max.z : cajaOtra.min.z);
      const q = aPantalla(esquina, ancho, alto);
      x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y);
    }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  function apartarColumna() {
    const ancho = lienzo.clientWidth, alto = lienzo.clientHeight;
    const antes = columnaComo.position.clone();
    corrida.set(0, 0, 0);
    const r = movil || !menuEntero ? null : menuEntero.getBoundingClientRect();
    if (r && r.width && r.height && ancho && alto && columnaComo.children.length) {
      camara.updateMatrixWorld();
      const menu = { x: r.left, y: r.top, w: r.width, h: r.height };
      // Lo que no pisa al correrse: la pantalla de la estación (nmw7160d0tit)
      const evitar = [cajaEnPantalla(como3d.pantalla, ancho, alto)];
      columnaComo.position.set(0, 0, 0);
      const enSuLugar = columnaEnPantalla(ancho, alto);
      const pide = enSuLugar ? apartarDelMenu(enSuLugar, menu, ancho, alto, haciaLaLinea(ancho, alto), evitar) : { dx: 0, dy: 0 };
      if (pide.dx || pide.dy) {
        columnaComo.position.copy(antes);
        const ahora = columnaEnPantalla(ancho, alto);
        const { dx, dy } = ahora ? apartarDelMenu(ahora, menu, ancho, alto, haciaLaLinea(ancho, alto), evitar) : { dx: 0, dy: 0 };
        const porPixel = (2 * (ahora ?? enSuLugar).hondo * Math.tan(THREE.MathUtils.degToRad(camara.fov) / 2)) / alto;
        derechaCam.setFromMatrixColumn(camara.matrixWorld, 0);
        arribaCam.setFromMatrixColumn(camara.matrixWorld, 1);
        corrida.copy(antes).addScaledVector(derechaCam, dx * porPixel).addScaledVector(arribaCam, -dy * porPixel);
      }
    }
    columnaComo.position.copy(quieto ? corrida : antes.lerp(corrida, 0.3));
    columnaComo.updateMatrixWorld(true);
  }

  // ── La estación actual: su tarjeta aparece solo cuando la cámara llega a ella, y se va al avanzar o retroceder (nota de
  // voz del titular nmw6p0g7htit: antes se encendía a mitad de camino y se asomaba transparente desde el principio). Llega
  // cuando la cámara se ve quieta: a 0,12 de la estación le falta menos del 1,5 % del tramo (masSuave(0,88) ≈ 0,986); con
  // 0,06 el texto esperaba unos 2 s más a que la cámara, ya quieta a la vista, terminara de acercarse (nmw6rki46tit)
  const LLEGADA = 0.12;
  let actual = -2;
  function marcar(w) {
    const k = Math.abs(w - Math.round(w)) <= LLEGADA ? Math.round(w) - 1 : -1;
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
    botonVoz.textContent = conVoz ? L('🔊 Voz', '🔊 Voice') : L('🔇 Sin voz', '🔇 No voice');
  };
  pintarBotonVoz();
  const voces = new Map();   // un Audio por clave, pedido antes de que suene
  // La velocidad de reproducción, como en la animación del principio (1x, 1,25x, 1,5x o 2x; nota de voz nmw2n33o6tit):
  // acelera la voz y el reloj del clip la sigue. Cada vez que se abre la página empieza a 1,25x, y quien la visita la
  // cambia cuando quiere durante su visita: no se guarda de una visita a otra (nota de voz del titular nmw5gelsmtit)
  const VELOCIDADES_CLIP = [1, 1.25, 1.5, 2], VELOCIDAD_INICIAL = 1.25;
  let velClip = VELOCIDAD_INICIAL;
  // La voz de Kokoro, un 35 % más rápida, como la animación, sin que cambie su tono (nmw1kwbsftit); la de Google, a su
  // ritmo natural (ritmoDeClave); las dos a la velocidad elegida
  const aSuRitmo = (a) => {
    const r = a.ritmo ?? RAPIDEZ;
    a.defaultPlaybackRate = r; a.playbackRate = r * velClip;
    a.preservesPitch = true; a.mozPreservesPitch = true; a.webkitPreservesPitch = true;
    return a;
  };
  const audioDe = (clave) => {
    if (!voces.has(clave)) { const a = new Audio(); a.preload = 'auto'; a.src = `voz/${vozEnIngles(clave) ? 'en' : 'es'}/${clave}.mp3`; a.ritmo = ritmoDeClave(clave); voces.set(clave, aSuRitmo(a)); }
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
  // Las voces de una animación se cargan todas al abrirla, detrás de un solo «Cargando la voz…»: entre un rótulo y otro
  // nunca se dibuja nada encima ni se oscurece (nota de voz del titular nmw5h32xptit; antes el velo salía cada vez que un
  // clip se pedía). Si no llegan en 20 s, sigue con las que haya
  let cargaDe = -1, cargaLista = true;
  function cargarVocesDe(i) {
    cargaDe = i; cargaLista = !conVoz || quieto;
    if (cargaLista) return;
    const llega = (a) => new Promise((ok) => {
      if (a.readyState >= 4) return ok();
      a.addEventListener('canplaythrough', ok, { once: true });
      a.addEventListener('error', ok, { once: true });
    });
    Promise.race([Promise.all(clavesDeClip(i).map((c) => llega(audioDe(c)))), new Promise((ok) => setTimeout(ok, 20000))])
      .then(() => { if (cargaDe === i) cargaLista = true; });
  }
  const cargandoVoz = () => conVoz && !quieto && seleccionado >= 0 && cargaDe === seleccionado && !cargaLista;
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
  // ── Lo del teléfono, fuera del dibujo (nmw8652hjtit, nmw87ytm7tit, nmw887qwvtit, nmw88fyfctit, nmw88hxyftit): las
  // píldoras de arriba, el subtítulo de un renglón, el carril para adelantar o devolver, el tiempo, «✕» y «Siguiente
  // problema ›» al final. pintarClip las llena por aparte
  const pildoraModo = popup?.querySelector('[data-pildora-modo]'), pildoraCuenta = popup?.querySelector('[data-pildora-cuenta]');
  const subClip = popup?.querySelector('[data-sub-clip]'), carrilClip = popup?.querySelector('[data-carril-clip]');
  const cronoClip = popup?.querySelector('[data-crono-clip]'), siguienteClip = popup?.querySelector('[data-siguiente-clip]');
  if (siguienteClip) siguienteClip.textContent = L('Siguiente problema ›', 'Next problem ›');
  popup?.querySelector('[data-cerrar-clip]')?.setAttribute('aria-label', L('Cerrar y volver al recorrido', 'Close and go back to the tour'));
  if (movil && popup) {
    let modoAntes = '', cuentaAntes = '', subAntes = null;
    aparte = {
      pildoras(modo, cuenta) {
        if (pildoraModo && modo !== modoAntes) {
          modoAntes = modo;
          pildoraModo.hidden = !modo;
          pildoraModo.className = `pildora-clip ${modo ?? ''}`;
          pildoraModo.textContent = modo === 'sin' ? L('Sin STL', 'Without STL') : modo === 'con' ? L('Con STL', 'With STL') : '';
        }
        if (pildoraCuenta && cuenta !== cuentaAntes) {
          cuentaAntes = cuenta;
          pildoraCuenta.hidden = !cuenta;
          pildoraCuenta.textContent = cuenta;
        }
        if (pildoraCuenta) pildoraCuenta.className = `pildora-clip ${modo ?? 'con'}`;
      },
      // Un solo renglón: si no cabe, la letra baja hasta 12 px; si ni así, se parte en dos y nunca se corta
      sub(texto, rojo) {
        if (!subClip || texto === subAntes) return;
        subAntes = texto;
        subClip.textContent = texto;
        subClip.classList.toggle('rojo', !!rojo);
        subClip.style.fontSize = ''; subClip.style.whiteSpace = '';
        let f = 16;
        while (subClip.scrollWidth > subClip.clientWidth + 1 && f > 12) { f -= 0.5; subClip.style.fontSize = `${f}px`; }
        if (subClip.scrollWidth > subClip.clientWidth + 1) { subClip.style.fontSize = ''; subClip.style.whiteSpace = 'normal'; }
      },
    };
  }
  const minutosClip = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  // El siguiente problema de la lista (en su orden), o -1 si es el último o es «Cómo empezar»
  const siguienteDe = (i) => (i >= 0 && i !== GUIA && i + 1 < problemas.length && orbes[i + 1] ? i + 1 : -1);
  function pintarAparte() {
    if (!aparte || seleccionado < 0) return;
    const dura = duraClip(seleccionado);
    carrilClip?.style.setProperty('--pos', String(dura ? Math.min(1, clipT / dura) : 0));
    if (cronoClip) cronoClip.textContent = `${minutosClip(clipT)} / ${minutosClip(dura)}`;
    const alFinal = terminado() && siguienteDe(seleccionado) >= 0;
    if (siguienteClip && siguienteClip.hidden === alFinal) siguienteClip.hidden = !alFinal;
    popup.classList.toggle('al-final', alFinal);
  }
  siguienteClip?.addEventListener('click', () => { const s = siguienteDe(seleccionado); if (s >= 0) abrirProblema(s); });
  popup?.querySelector('[data-cerrar-clip]')?.addEventListener('click', () => cerrarPopup());
  // El carril: un toque lleva la animación a ese punto, y arrastrar la adelanta o la devuelve (nmw87ytm7tit)
  let arrastreCarril = null;
  const puntoDelCarril = (e) => { const b = carrilClip.getBoundingClientRect(); return Math.max(0, Math.min(1, (e.clientX - b.left - 8) / Math.max(1, b.width - 16))); };
  carrilClip?.addEventListener('pointerdown', (e) => {
    if (seleccionado < 0) return;
    e.preventDefault();
    carrilClip.setPointerCapture(e.pointerId);
    arrastreCarril = { seguia: !pausado };
    pausar(true);
    moverClip(puntoDelCarril(e) * duraClip(seleccionado) - clipT);
  });
  carrilClip?.addEventListener('pointermove', (e) => { if (arrastreCarril && seleccionado >= 0) moverClip(puntoDelCarril(e) * duraClip(seleccionado) - clipT); });
  const soltarCarril = () => { if (!arrastreCarril) return; const s = arrastreCarril.seguia; arrastreCarril = null; if (s && !terminado()) pausar(false); };
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) carrilClip?.addEventListener(ev, soltarCarril);
  function pintarMando() {
    pintarAparte();
    const corre = !pausado && !terminado();
    pausaClip?.querySelector('path')?.setAttribute('d', corre ? ICONO_PAUSA : ICONO_SEGUIR);
    pausaClip?.setAttribute('aria-label', corre ? L('Pausar la animación', 'Pause the animation') : terminado() ? L('Verla otra vez', 'Watch it again') : L('Seguir la animación', 'Resume the animation'));
    giroClip?.setAttribute('transform', `rotate(${((clipT / VUELTA_CLIP) * 360) % 360} 60 60)`);
    const s = Math.floor(clipT);
    if (perillaClip && s !== segundoClip) {
      segundoClip = s;
      perillaClip.setAttribute('aria-valuenow', String(s));
      perillaClip.setAttribute('aria-valuetext', `${L('segundo', 'second')} ${s} ${L('de', 'of')} ${Math.round(seleccionado >= 0 ? duraClip(seleccionado) : 0)}`);
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
    // En un teléfono no se cierra sola: al final espera con «Siguiente problema ›» (nmw88fyfctit)
    if (movil) autocierre.repetir();
    problemas.forEach((otro, j) => otro.classList.toggle('activo', j === i));
    document.getElementById('popup-respuesta').textContent = d.querySelector('p').textContent;   // para quien lee con un lector de pantalla
    if (disposicion) { camara.updateMatrixWorld(); origenPopup = aPantalla(orbes[i].orbe.position, disposicion.ancho, disposicion.alto); }
    popup.hidden = false;
    // La animación de salida, otra vez desde el ícono nuevo
    popup.classList.remove('sale'); void popup.offsetWidth; popup.classList.add('sale');
    pantalla2.abierta = true;
    ponerReproductor();
    cargarVocesDe(i);   // sus voces, todas desde ya, con un solo «Cargando la voz…»
    empezarClip();
    if (quieto && ctxClip) { pintarClip(ctxClip, i, duraClip(i)); }
  }
  // Se cierra con Esc, con la rueda fuera de él, con el menú, o solo (4 s después del fin de su animación): sin botón para
  // cerrarlo, porque sus mandos quedan fijos adentro (nmw40cp3jtit). El anillo vuelve a su tamaño y al centro
  cerrarPopup = () => {
    if (seleccionado < 0) return false;
    callar();
    const eraGuia = seleccionado === GUIA;
    if (eraGuia) salirDeComo();
    seleccionado = -1;
    problemas.forEach((d) => d.classList.remove('activo'));
    if (popup && eraGuia && !quieto) encogerHaciaLaPantalla();
    else if (popup) popup.hidden = true;
    pantalla2.abierta = false;
    return true;
  };
  // Dónde queda en la pantalla del navegador la pantalla 3D de «Cómo empezar» (nmw6lwwbxtit)
  function dondeEstaLaPantalla() {
    if (!como3d.pantalla || !disposicion) return null;
    camara.updateMatrixWorld();
    return aPantalla(como3d.pantalla.position, disposicion.ancho, disposicion.alto);
  }
  // Al cerrarse «Cómo empezar» (al irse de la estación, con Esc o con el menú), el reproductor se encoge de vuelta hacia la
  // pantalla 3D, que reaparece cuando termina: es la misma pantalla, que vuelve a su tamaño (nmw6lwwbxtit)
  function encogerHaciaLaPantalla() {
    const o = dondeEstaLaPantalla(), r = popup.getBoundingClientRect();
    if (o) popup.style.transformOrigin = `${Math.round(o.x - r.left)}px ${Math.round(o.y - r.top)}px`;
    como3d.volviendo = true;
    popup.classList.remove('sale'); void popup.offsetWidth; popup.classList.add('vuelve');
    setTimeout(() => {
      popup.classList.remove('vuelve');
      if (seleccionado < 0) popup.hidden = true;
      como3d.volviendo = false;
    }, 450);
  }
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
    popup.setAttribute('aria-label', L('Cómo empezar a usar STL Studio', 'How to start using STL Studio'));
    document.getElementById('popup-respuesta').textContent = [...GUION_COMO.escenas, GUION_COMO.cierre].join(' ');
    // Crece desde la pantalla 3D de la estación, la misma que lo muestra (nmw6lwwbxtit)
    origenPopup = dondeEstaLaPantalla();
    como3d.volviendo = false;
    popup.classList.remove('vuelve');
    popup.hidden = false;
    popup.classList.remove('sale'); void popup.offsetWidth; popup.classList.add('sale');
    pantalla2.abierta = true;
    ponerReproductor();
    cargarVocesDe(GUIA);
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
    popup?.setAttribute('aria-label', L('Cómo lo resuelve STL', 'How STL solves it'));
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
    if (pedidoComo) { pedidoComo.textContent = pedido ? L(`Por ejemplo: «${pedido}»`, `For example: «${pedido}»`) : ''; pedidoComo.hidden = !pedido; }
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
  // La pantalla 3D de «Cómo empezar» también se oprime: un clic en ella la agranda y empieza su animación, como «▶ Ver cómo
  // empezar» (nmw6lwwbxtit)
  function sobreLaPantalla(e) {
    if (!como3d.pantalla?.visible || Math.abs(cur - 3) > 0.45 || visorAbierto()) return false;
    const r = lienzo.getBoundingClientRect();
    puntero.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    rayo.setFromCamera(puntero, camara);
    return rayo.intersectObject(como3d.pantalla, true).length > 0;
  }
  lienzo.addEventListener('click', (e) => {
    const i = bajoElPuntero(e);
    if (i >= 0) alternarProblema(i);
    else if (sobreLaPantalla(e)) { guia.visita = true; abrirComo(); }
  });
  lienzo.addEventListener('pointermove', (e) => {
    const i = bajoElPuntero(e);
    lienzo.style.cursor = i >= 0 || sobreLaPantalla(e) ? 'pointer' : '';
    if (i !== sobre) mostrarNombre(i);
  });
  lienzo.addEventListener('pointerleave', () => mostrarNombre(-1));
  // ── En un teléfono, el anillo de la estación 2 se toca (pd_telefono_vertical, pieza 5; nmw7yjlhntit): sin ratón no hay
  // globo al pasar, así que sus siete nombres van debajo del anillo, cada uno un botón que abre o cierra su problema, como
  // un toque en su ícono; el que ya se vio lleva su ✓. Solo en la estación 2 y con ningún reproductor abierto
  const nombresAnillo = movil ? document.createElement('div') : null;
  if (nombresAnillo) {
    nombresAnillo.className = 'nombres-anillo';
    nombresAnillo.hidden = true;
    // En dos renglones, 4 y 3, ordenados por el largo de su texto (nota de voz del titular nmw87ytm7tit): los cuatro más
    // cortos arriba y los tres más largos abajo; la letra baja lo justo para que cada renglón quepa a lo ancho
    const botones = orbes.map((o, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = o.titulo;
      b.addEventListener('click', () => alternarProblema(i));
      return b;
    });
    const enOrden = [...botones].sort((a, b) => a.textContent.length - b.textContent.length);
    for (const fila of [enOrden.slice(0, 4), enOrden.slice(4)]) {
      const f = document.createElement('div');
      f.className = 'fila';
      f.append(...fila);
      nombresAnillo.append(f);
    }
    document.body.append(nombresAnillo);
    alResolver.push((i) => botones[i]?.classList.add('visto'));
  }
  // La letra de los nombres, la más grande (de 13 a 10 px) con la que cada renglón cabe en uno
  let letraNombres = 0;
  function ajustarLetraNombres() {
    const filas = [...nombresAnillo.querySelectorAll('.fila')];
    let f = 13;
    nombresAnillo.style.setProperty('--letra-nombres', `${f}px`);
    while (f > 10 && filas.some((x) => x.scrollWidth > x.clientWidth + 1)) { f -= 0.5; nombresAnillo.style.setProperty('--letra-nombres', `${f}px`); }
    letraNombres = innerWidth;
  }
  function ponerNombres() {
    if (!nombresAnillo) return;
    const ver = actual === 1 && seleccionado < 0 && !pantalla2.abierta && !visorAbierto() && !!anillo.centro && !!disposicion;
    nombresAnillo.hidden = !ver;
    if (!ver) return;
    if (letraNombres !== innerWidth) ajustarLetraNombres();
    camara.updateMatrixWorld();
    const abajo = aPantalla(anillo.centro.clone().addScaledVector(ARRIBA, -anillo.radioY * anillo.escala), disposicion.ancho, disposicion.alto);
    // Nunca debajo del panel de la estación, abajo
    const panel = lineaDos?.getBoundingClientRect(), fondo = panel?.height ? panel.top : disposicion.alto;
    const limite = Math.max(0, fondo - nombresAnillo.offsetHeight - 8);
    nombresAnillo.style.top = `${Math.round(Math.min(limite, Math.max(60, abajo.y + 18)))}px`;
  }

  // ── El bucle: solo dibuja mientras el recorrido está a la vista
  let enVista = false, cur = 0, primera = true, ultimoCuadro = performance.now(), ultimaRueda = 0, arranque = false;
  addEventListener('wheel', () => { ultimaRueda = performance.now(); arranque = false; }, { passive: true });
  new IntersectionObserver(([e]) => { enVista = e.isIntersecting; if (enVista) requestAnimationFrame(cuadro); }, { rootMargin: '200px' })
    .observe(document.getElementById('viaje'));
  let dibujados = 0;
  // En un teléfono: sus primeros segundos se miden (cuántos cuadros dibuja), y el que no alcanza FPS_MINIMO queda cubierto
  // (nmw7yb1bttit); y el mundo descansa cuando nada se mueve: con la cámara quieta, ningún reproductor abierto y
  // MS_REPOSO sin tocar la pantalla, deja de dibujar hasta el próximo toque o desplazamiento (pd_telefono_vertical, pieza 1)
  const MS_REPOSO = 20000;
  let medidaFps = null, ultimoToque = performance.now(), enReposo = false;
  // ?sinmedir: sin esa medida, para capturar el recorrido con un navegador sin pantalla, que dibuja el 3D con el procesador
  const medirFps = movil && fijo === null && !enVideo && !compartir && !new URLSearchParams(location.search).has('sinmedir');
  if (medirFps) addEventListener('load', () => setTimeout(() => { if (!document.hidden) medidaFps = { desde: performance.now(), n: 0 }; }, 1000), { once: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) medidaFps = null; });
  function despertar() {
    ultimoToque = performance.now();
    if (enReposo && enVista && !cubierto) { enReposo = false; requestAnimationFrame(cuadro); }
  }
  if (movil) for (const ev of ['scroll', 'touchstart', 'pointerdown', 'keydown']) addEventListener(ev, despertar, { passive: true });
  function cuadro() {
    if (!enVista || cubierto) return;
    // En ?ver=N, unos segundos de cuadros y se queda quieta: así se puede capturar sin pantalla
    if (fijo !== null && !enVideo && ++dibujados > 150) return;
    const w = objetivo();
    cur = quieto ? Math.round(w) : primera ? w : cur + (w - cur) * (arranque ? SUAVIZADO_ARRANQUE : suavizadoPara(w - cur));
    if (arranque && Math.abs(cur - 1) <= LLEGADA / 4) arranque = false;   // llegó a la estación 1
    primera = false;
    // Si la persona se va de la estación 2 (o de la 3, con «Cómo empezar») con un reproductor abierto (por la barra de
    // scroll, el teclado…), se cierra
    if (seleccionado >= 0 && Math.abs(cur - (seleccionado === GUIA ? 3 : 2)) > 0.45) cerrarPopup();
    const ahoraMs = performance.now(), dt = Math.min(0.1, (ahoraMs - ultimoCuadro) / 1000);
    // «Cómo empezar» ya no se abre solo al llegar a la estación 3: lo abre el visitante con «▶ Ver cómo empezar» (nota de voz
    // del titular nmw5wbs86tit, 7 de noviembre de 2026: «el visitante será el que le dé clic a empezar la animación»)
    if (Math.abs(cur - 3) > 0.45) guia.visita = false;
    pintarExtraComo();
    // Con «Cómo empezar» abierto, su tarjeta (que es solo el botón) se esconde entera
    if (lineaTres) lineaTres.style.visibility = seleccionado === GUIA ? 'hidden' : '';
    // Mientras «Cómo empezar» está abierto (o se encoge de vuelta), su pantalla 3D se apaga: el reproductor es ella en grande
    if (como3d.pantalla) como3d.pantalla.visible = como3d.brillo.visible = !(seleccionado === GUIA || como3d.volviendo);
    ultimoCuadro = ahoraMs;
    // El reproductor se abre o se cierra suave: el anillo se achica y se corre hacia el menú, o vuelve
    const meta = pantalla2.abierta ? 1 : 0;
    pantalla2.cam = quieto ? meta : pantalla2.cam + (meta - pantalla2.cam) * Math.min(1, dt * 4);
    if (quieto) anillo.mover?.(0);
    colocar(cur);
    marcar(cur);
    segunLejania.forEach((f) => f());
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
    ponerNombres();
    // El cielo, en el mismo bucle: cada capa acompaña a la cámara (paralaje) y el tiempo del titileo avanza; con movimiento
    // reducido uMueve vale 0 y ninguna estrella titila (el cielo no se mueve por su cuenta)
    for (const c of capasCielo) c.puntos.position.copy(camara.position).multiplyScalar(c.sigue);
    nebulosa.position.copy(camara.position);   // el fondo acompaña a la cámara: el mismo en todas las direcciones
    if (!quieto) cieloUniformes.uTiempo.value = ahoraMs / 1000;
    renderer.render(escena, camara);
    if (medidaFps && ++medidaFps.n && ahoraMs - medidaFps.desde >= MS_MEDIR_FPS) {
      const fps = (medidaFps.n * 1000) / (ahoraMs - medidaFps.desde);
      medidaFps = null;
      if (fps < FPS_MINIMO) return cubrirLento();
    }
    if (movil && !quieto && !medidaFps && seleccionado < 0 && !pantalla2.abierta && Math.abs(w - cur) < 1e-3 && ahoraMs - ultimoToque > MS_REPOSO) {
      enReposo = true;
      return;
    }
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
  // «Empieza el recorrido» lleva hasta la estación 1, justo donde la cámara se detiene y «Qué es STL» queda listo para leer,
  // el mismo punto al que lleva su entrada del menú (antes el enlace caía al borde de arriba de su bloque y se quedaba antes
  // de llegar), y en la mitad del tiempo (SUAVIZADO_ARRANQUE; nota de voz del titular nmw6xuro1tit)
  document.querySelector('.entrada .bajar')?.addEventListener('click', (e) => {
    relojes.forEach((_, k) => empezarEstacion(k));
    if (fijo !== null) return;
    e.preventDefault();
    medir();
    arranque = true;
    scrollTo({ top: anclas[1], behavior: quieto ? 'auto' : 'smooth' });
    history.replaceState(null, '', '#e-que-es');
  });
  // «¿Qué es STL?» y «Empieza el recorrido», arriba de la portada: al primer acercamiento se van hacia arriba, despacio, y
  // se desvanecen (nota de voz del titular nmw6lwwbxtit); con movimiento reducido, solo se desvanecen
  const entrada = document.querySelector('.entrada');
  function irseLaEntrada() {
    if (!entrada) return;
    const e = suave(tope(scrollY / Math.max(innerHeight * 0.45, 1)));
    entrada.style.opacity = String(1 - e);
    entrada.style.transform = quieto ? '' : `translateY(${(-e * 8).toFixed(2)}vh)`;
  }
  addEventListener('scroll', irseLaEntrada, { passive: true });
  irseLaEntrada();
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
  // ?ver=3&abrir=como: «Cómo empezar» ya abierto, para capturar dónde quedan sus referencias junto al menú (nmw6z8b3btit)
  if (fijo !== null && abrirN === 'como') { guia.visita = true; abrirComo(); pantalla2.cam = 1; }
  // Todo en su lugar desde el primer cuadro (con movimiento reducido, nada más se mueve)
  animar.forEach((f) => f(0));
  colocar(0);
  segunLejania.forEach((f) => f());
  renderer.render(escena, camara);
}

// Al final, con todo lo de arriba ya definido: las constantes de las mini animaciones (suave, TINTAS…) aún no existían
// si el mundo arrancaba antes, y la página se quedaba sin 3D
if (lienzo && estaciones.length && hayWebGL()) {
  document.documentElement.classList.add('js-3d');
  if (fijo !== null) document.documentElement.classList.add('ver-parada');
  if (compartir) document.documentElement.classList.add('compartir');
  iniciar();
} else if (movil && lienzo && estaciones.length) cubrirLento();
// ?lento: el aviso del teléfono lento, a propósito, para revisarlo
if (new URLSearchParams(location.search).has('lento')) cubrirLento();
// Ya se sabe si hay 3D: la página se muestra, con él o sin él (nmw6lwwbxtit), cuando está lista: la carga a página completa
// (nmw6p3dj8tit) espera el evento load y un instante más (el primer cuadro ya se dibujó en iniciar), para que el menú y «ES · EN» ya estén en su lugar, y se desvanece
// despacio. Para capturar (?ver=N, la imagen al compartir) o grabar el video, sin carga
function mostrarPagina() {
  document.documentElement.classList.remove('cargando-3d');
}
if (fijo !== null || compartir || enVideo) {
  document.documentElement.classList.add('sin-cargador');
  mostrarPagina();
} else {
  const listo = () => setTimeout(mostrarPagina, 150);
  if (document.readyState === 'complete') listo();
  else addEventListener('load', listo, { once: true });
}
if (enVideo) import('./video-corto.js').then((m) => m.montar({ grandes: GRANDES, pintarClip, duraClip, tramoDeVoz, gancho: ganchoVideo, sinCuenta: () => { sinCuenta = true; } }));
