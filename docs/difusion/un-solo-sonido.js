// Un solo sonido a la vez en todo el recorrido de «Qué es STL» (nota de voz del titular nmwr9og6ttit, 22 de noviembre de
// 2026): en un Windows nuevo, la voz de la presentación llegó tarde y empezó a sonar sola, encima de otra. Esta guarda va
// en cada página del recorrido (mundo-3d.html y la animación del principio, linea-del-proyecto.html, que vive en su
// iframe) antes que su código, y vale para cualquier reproducción, la de hoy y la que se agregue:
// 1. Toda reproducción nueva calla todas las demás: las de su página y, por un canal entre páginas, las de las otras
//    (el iframe, la página que lo contiene, otra pestaña del recorrido), con sus animaciones en pausa donde iban.
// 2. Un clip que termina de cargar tarde nunca empieza solo: si al empezar ya no es el último que se pidió, si su página
//    perdió la palabra (la persona tocó otra) o si la pestaña está oculta, se pausa.
// 3. Con la pestaña oculta, todo se pausa donde iba, la animación y su voz, y nada suena de fondo: la persona le da play
//    otra vez al volver.
// La palabra la tiene la página que la persona tocó por última vez (un clic, una tecla); la que no la tiene no suena.
// Clásico, sin módulos: lo prueba tools/recorrido3d.test.ts en un contexto aparte (vm), con un document y un canal falsos.
(function (g) {
  if (!g || g.STLSonido || !g.HTMLMediaElement) return;
  const doc = g.document;
  const id = Math.random().toString(36).slice(2);
  const canal = typeof g.BroadcastChannel === 'function' ? new g.BroadcastChannel('stl-un-solo-sonido') : null;
  const medios = new Set();          // los clips que alguna vez se pidieron en esta página
  const alCallar = [];               // cómo se pausa cada animación de esta página
  let actual = null;                 // el último clip que se pidió aquí: el único que puede sonar
  let palabra = true;                // esta página puede sonar (la persona no tocó otra después)
  const play = g.HTMLMediaElement.prototype.play;
  const oculta = () => !!doc && !!doc.hidden;

  function callarMedios(excepto) {
    for (const m of medios) if (m !== excepto && !m.paused) { try { m.pause(); } catch { /* ya se fue */ } }
  }
  // Calla todo lo de esta página: sus clips y sus animaciones, en pausa donde iban
  function callarTodo() {
    actual = null;
    callarMedios(null);
    for (const f of alCallar) { try { f(); } catch { /* una animación que ya no está */ } }
  }
  function avisar(tipo) { try { canal && canal.postMessage({ tipo, de: id }); } catch { /* sin canal */ } }

  // Al empezar de verdad (playing): si ya no es el que se pidió por último, si esta página perdió la palabra o si la
  // pestaña está oculta, se pausa. Así un clip que llega tarde nunca suena solo
  function vigilar(m) {
    if (medios.has(m)) return;
    medios.add(m);
    m.addEventListener('playing', () => { if (m !== actual || !palabra || oculta()) { try { m.pause(); } catch { /* ya se fue */ } } });
  }

  g.HTMLMediaElement.prototype.play = function () {
    vigilar(this);
    if (oculta() || !palabra) {
      // No suena: su animación se queda en pausa donde iba, y la persona le da play cuando quiera
      callarTodo();
      return Promise.resolve();
    }
    actual = this;
    callarMedios(this);
    avisar('suena');
    return play.call(this);
  };

  // La persona tocó esta página: la palabra es suya y las otras se callan
  function tomar() {
    if (!palabra) palabra = true;
    avisar('toma');
  }
  if (canal) canal.onmessage = (e) => {
    const d = e && e.data;
    if (!d || d.de === id) return;
    if (d.tipo === 'suena' || d.tipo === 'toma') { palabra = false; callarTodo(); }
  };
  if (doc) {
    for (const ev of ['pointerdown', 'keydown', 'touchstart', 'wheel']) doc.addEventListener(ev, tomar, { capture: true, passive: true });
    doc.addEventListener('visibilitychange', () => { if (doc.hidden) callarTodo(); });
  }
  g.addEventListener?.('pagehide', callarTodo);

  g.STLSonido = {
    /** Cómo se pausa una animación de esta página cuando otro sonido empieza o la pestaña se oculta */
    alCallar(f) { alCallar.push(f); },
    /** La página la toma por su cuenta (al abrir algo que la persona pidió en otra) */
    tomar,
    callarTodo,
    /** Para las pruebas: quién puede sonar */
    estado: () => ({ palabra, actual, medios: medios.size }),
  };
})(typeof window !== 'undefined' ? window : globalThis);
