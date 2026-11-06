// El video corto de la difusión (pedido pd_voz_video), horizontal y en español, hecho con las animaciones del recorrido y
// la voz de Kai, no grabando el Studio (nmw1ce33itit; solo el horizontal, nmw1gcx6ytit). Se abre con ?video en el
// recorrido (mundo-3d.html?video): la página se vuelve el video, en pantalla completa, y un botón lo reproduce de
// principio a fin, para verlo o grabarlo. Su montaje, como lo decidió el titular:
// - unos 8 segundos del ciclo de la estación 1 bajo «¿Qué es STL?» (nmw47nttptit), en el momento en que el director habla
//   con el modelo;
// - tres problemas de «¿Te ha pasado…?», «Atención dispersa», «Respuestas largas» y «Mensajes incompletos»
//   (nmw47pe1qtit), cada uno en su versión corta: su enunciado, una situación y su solución con su cierre (nmw47naiitit),
//   con las voces de Kai que ya suenan en el recorrido (voz/es/ con su clave);
// - y la pantalla final de GitHub con el enlace a la página pública (nmw47pe1qtit).
// Lleva una música suave de fondo, muy baja bajo la voz (nmw3q8tr7tit). Su licencia, revisada antes de usarla: la música
// no se baja de ningún lado, la toca esta misma página con el audio del navegador (Web Audio), cuatro acordes lentos
// escritos aquí (ACORDES). Es parte del código del Studio, bajo su misma licencia MIT (LICENSE), sin derechos de nadie
// más que pedir ni atribuir.
//
// Lo de arriba es puro (VIDEO, ACORDES, acortar, montaje, parteEn): se prueba sin navegador (tools/recorrido3d.test.ts).
// montar() es lo único que toca la página; lo llama mundo-3d.js con lo que necesita de él.

export const VIDEO = {
  // La estación 1: cuánto se ve y desde qué segundo de su ciclo (el director habla con el modelo hacia el segundo 11)
  estacion1: 8,
  desdeEstacion1: 5,
  titulo: '¿Qué es STL?',
  // Los tres problemas, en su orden: i es su lugar en «¿Te ha pasado…?» (GRANDES de mundo-3d.js) y segmento, la situación
  // que se queda en su versión corta (la primera de cada uno)
  problemas: [
    { i: 0, segmento: 1, nombre: 'Atención dispersa' },
    { i: 3, segmento: 3, nombre: 'Respuestas largas' },
    { i: 1, segmento: 0, nombre: 'Mensajes incompletos' },
  ],
  // Al menos un segundo entre una parte y la siguiente (lo pidió el titular para la narración, pd_narrador)
  entre: 1.2,
  // La pantalla final
  final: 7,
  enlace: 'https://argwabot.github.io/STL-Sacred_Time_Line/',
  // La música, muy baja: la voz manda
  volumen: 0.05,
};

// Cuatro acordes lentos, en hercios, de cuatro segundos cada uno: do mayor con séptima, la menor con séptima, fa mayor con
// séptima y sol con sexta. Suaves y sin percusión, para que no compitan con Kai
export const ACORDES = [
  [130.81, 164.81, 196.0, 246.94],
  [110.0, 130.81, 164.81, 196.0],
  [87.31, 110.0, 130.81, 164.81],
  [98.0, 123.47, 146.83, 164.81],
];
export const ACORDE_SEG = 4;

// La versión corta de cada problema: su animación con una sola situación. Cambia la lista de situaciones del recorrido
// (GRANDES), que solo se usa así en la página del video
export function acortar(grandes, problemas = VIDEO.problemas) {
  for (const { i, segmento } of problemas) {
    if (!grandes[i]?.includes(segmento)) throw new Error(`El problema ${i} no tiene la situación ${segmento}.`);
    grandes[i] = [segmento];
  }
  return grandes;
}

// Las partes del video, una tras otra, con el segundo en que empieza cada una y lo que dura. duraClip(i) es lo que dura la
// animación del problema i, ya acortada
export function montaje(duraClip, v = VIDEO) {
  const partes = [];
  let desde = 0;
  const poner = (parte) => { partes.push({ ...parte, desde }); desde += parte.dura; };
  poner({ tipo: 'estacion1', dura: v.estacion1 });
  for (const p of v.problemas) {
    poner({ tipo: 'pausa', dura: v.entre });
    poner({ tipo: 'clip', i: p.i, nombre: p.nombre, dura: duraClip(p.i) });
  }
  poner({ tipo: 'pausa', dura: v.entre });
  poner({ tipo: 'final', dura: v.final });
  return { partes, total: desde };
}

// Qué parte se ve en el segundo s del video, y cuánto lleva de ella. Al terminar, la última, quieta en su final
export function parteEn(m, s) {
  const t = Math.max(0, Math.min(m.total, s));
  const parte = m.partes.find((p) => t < p.desde + p.dura) ?? m.partes[m.partes.length - 1];
  return { parte, t: Math.min(parte.dura, t - parte.desde) };
}

// ── Lo que toca la página
const ESTILO = `
  html.video, html.video body { overflow: hidden; }
  html.video .menu, html.video .estaciones, html.video .fin, html.video .saltar, html.video .cubierta-movil, html.video .popup, html.video #info { display: none !important; }
  #video-corto { position: fixed; inset: 0; z-index: 50; display: grid; place-items: center; background: transparent; font-family: system-ui, sans-serif; }
  #video-corto [hidden] { display: none !important; }
  #video-corto .cuadro { position: relative; width: min(100vw, calc(100vh * 16 / 9)); aspect-ratio: 16 / 9; overflow: hidden; }
  #video-corto .cuadro.negro { background: #07090f; }
  #video-corto canvas { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; background: #07090f; }
  #video-corto .titulo { position: absolute; left: 0; right: 0; top: 7%; text-align: center; color: #f5d27a; font-weight: 700; font-size: 4.6vmin; letter-spacing: .02em; text-shadow: 0 0 24px rgba(0, 0, 0, .8); opacity: 0; transition: opacity .8s; }
  #video-corto .titulo.ve { opacity: 1; }
  #video-corto .final { position: absolute; inset: 0; display: grid; place-content: center; gap: 2.4vmin; text-align: center; background: radial-gradient(circle at 50% 40%, #141a2e, #07090f 70%); color: #fff6d8; opacity: 0; transition: opacity .8s; }
  #video-corto .final.ve { opacity: 1; }
  #video-corto .final .marca { font-size: 7vmin; font-weight: 800; color: #f5d27a; }
  #video-corto .final .lema { font-size: 3vmin; color: #c9c3b2; }
  #video-corto .final .github { margin-top: 2vmin; font-size: 3.4vmin; font-weight: 700; }
  #video-corto .final .enlace { display: inline-block; justify-self: center; padding: 1.4vmin 3vmin; border-radius: 99px; font-size: 3vmin; color: #07090f; background: #f5d27a; text-decoration: none; font-weight: 700; }
  #video-corto .empezar { position: absolute; inset: 0; display: grid; place-content: center; gap: 2vmin; text-align: center; background: rgba(7, 9, 15, .82); color: #fff6d8; }
  #video-corto .empezar button { font: 700 3.4vmin system-ui, sans-serif; padding: 1.6vmin 4vmin; border-radius: 99px; border: 0; cursor: pointer; color: #07090f; background: #f5d27a; }
  #video-corto .empezar small { font-size: 2vmin; color: #b9b4a6; }
`;

// La música: cada acorde entra y sale despacio, por un filtro que le quita el brillo, y toda ella baja al final
function tocarMusica(ctx, total, volumen) {
  const salida = ctx.createGain(), filtro = ctx.createBiquadFilter();
  filtro.type = 'lowpass'; filtro.frequency.value = 900;
  filtro.connect(salida); salida.connect(ctx.destination);
  const t0 = ctx.currentTime + 0.1;
  salida.gain.setValueAtTime(0, t0);
  salida.gain.linearRampToValueAtTime(volumen, t0 + 3);
  salida.gain.setValueAtTime(volumen, t0 + Math.max(3, total - 4));
  salida.gain.linearRampToValueAtTime(0, t0 + total);
  for (let k = 0, a = t0; a < t0 + total; k++, a += ACORDE_SEG) {
    for (const f of ACORDES[k % ACORDES.length]) {
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = f;
      g.gain.setValueAtTime(0, a);
      g.gain.linearRampToValueAtTime(0.22, a + 1.6);
      g.gain.linearRampToValueAtTime(0, a + ACORDE_SEG + 1.2);
      osc.connect(g); g.connect(filtro);
      osc.start(a); osc.stop(a + ACORDE_SEG + 1.3);
    }
  }
  return () => { try { salida.gain.cancelScheduledValues(ctx.currentTime); salida.gain.setValueAtTime(0, ctx.currentTime); } catch { /* ya cerrado */ } };
}

export function montar({ grandes, pintarClip, duraClip, tramoDeVoz, gancho, sinCuenta }) {
  acortar(grandes);
  sinCuenta?.();
  const m = montaje(duraClip);
  const params = new URLSearchParams(location.search);
  const quietoEn = params.has('seg') ? Number(params.get('seg')) || 0 : null;   // ?video&seg=S: quieto en el segundo S, para capturarlo
  document.documentElement.classList.add('video');
  const estilo = document.createElement('style');
  estilo.textContent = ESTILO;
  document.head.append(estilo);
  const raiz = document.createElement('div');
  raiz.id = 'video-corto';
  raiz.innerHTML = `<div class="cuadro">
    <canvas width="1280" height="800" hidden aria-hidden="true"></canvas>
    <div class="titulo">${VIDEO.titulo}</div>
    <div class="final" aria-hidden="true"><div class="marca">STL Studio</div><div class="lema">El guardrail donde más hacía falta, en el Dev</div><div class="github">Gratis, en GitHub</div><a class="enlace" href="${VIDEO.enlace}">${VIDEO.enlace.replace(/^https:\/\//, '').replace(/\/$/, '')}</a></div>
    <div class="empezar"><button type="button">▶ Reproducir el video</button><small>Dura ${Math.round(m.total)} segundos. Para grabarlo, ponlo en pantalla completa con F11.</small></div>
  </div>`;
  document.body.append(raiz);
  const cuadro = raiz.querySelector('.cuadro'), lienzo = raiz.querySelector('canvas'), ctx = lienzo.getContext('2d');
  const titulo = raiz.querySelector('.titulo'), final = raiz.querySelector('.final'), empezar = raiz.querySelector('.empezar');
  const voces = new Map();
  const audioDe = (clave) => { if (!voces.has(clave)) { const a = new Audio(`voz/es/${clave}.mp3`); a.preload = 'auto'; voces.set(clave, a); } return voces.get(clave); };
  for (const p of m.partes) if (p.tipo === 'clip') { for (let t = 0; t < p.dura; t += 0.25) { const tr = tramoDeVoz(p.i, t); if (tr) audioDe(tr.clave); } }

  // Lo que se ve en un momento: la parte, con su lienzo, su título o su pantalla final
  function pintar(parte, t) {
    titulo.classList.toggle('ve', parte.tipo === 'estacion1');
    final.classList.toggle('ve', parte.tipo === 'final');
    cuadro.classList.toggle('negro', parte.tipo !== 'estacion1');
    lienzo.hidden = parte.tipo !== 'clip';
    if (parte.tipo === 'clip') pintarClip(ctx, parte.i, t);
  }
  if (quietoEn !== null) {
    empezar.hidden = true;
    const { parte, t } = parteEn(m, quietoEn);
    if (parte.tipo === 'estacion1') gancho.estacion1?.(VIDEO.desdeEstacion1 + t);
    pintar(parte, t);
    return;
  }
  gancho.estacion1?.(VIDEO.desdeEstacion1);
  pintar(m.partes[0], 0);
  titulo.classList.remove('ve');

  empezar.querySelector('button').addEventListener('click', () => {
    empezar.hidden = true;
    let parar = () => {};
    try { const ac = new AudioContext(); parar = tocarMusica(ac, m.total, VIDEO.volumen); } catch { /* sin audio del navegador, sin música */ }
    gancho.estacion1?.(VIDEO.desdeEstacion1);
    // El reloj del video: corre con el tiempo real, y si una voz aún habla cuando le toca al paso siguiente, la espera
    // (la voz manda, como en el recorrido), nunca más de tres segundos
    let s = 0, antes = performance.now(), dicha = '', hablando = null, espera = 0;
    function cuadroDelVideo(ahora) {
      const dt = Math.min(0.1, (ahora - antes) / 1000);
      antes = ahora;
      const { parte, t } = parteEn(m, s);
      let avanza = true;
      if (parte.tipo === 'clip') {
        const tramo = tramoDeVoz(parte.i, t);
        if (tramo && tramo.clave !== dicha) {
          hablando?.pause();
          dicha = tramo.clave;
          hablando = audioDe(tramo.clave);
          hablando.currentTime = Math.max(0, t - tramo.desde);
          hablando.play().catch(() => { hablando = null; });
          espera = 0;
        }
        if (tramo && hablando && !hablando.ended && !hablando.paused && t + dt >= tramo.desde + tramo.voz && espera < 3) { avanza = false; espera += dt; }
      }
      if (avanza) s += dt;
      pintar(parte, Math.min(parte.dura, t));
      if (s < m.total) requestAnimationFrame(cuadroDelVideo);
      else parar();
    }
    requestAnimationFrame(cuadroDelVideo);
  });
}
