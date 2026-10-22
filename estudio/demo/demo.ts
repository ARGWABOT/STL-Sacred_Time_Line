// El Studio de demostración: la interfaz real del Studio con un proyecto de ejemplo (estudio/demo/datos.ts), sin
// servidor y sin guardar nada. Todo lo que el Studio le pide a su servidor se responde aquí; lo que cambiaría algo (un
// comentario, entregar una misión, pedir la revisión) no se guarda: se explica qué pasaría en tu Studio. Encima va un recorrido
// guiado: resalta cada parte y la explica, paso a paso. Se publica con la página pública de «Qué es STL»
// (tools/publicar-stl.ts) y se ve en el Studio local con http://localhost:5180/?demo.
import './demo.css';
import { datosDemo, documentoDemo, documentosDemo } from './datos';

// La página pública de la metodología: de ahí se llega al Studio cuando se publique
const PUBLICA = 'https://argwabot.github.io/STL-Sacred_Time_Line/';

// ───────────────────────────────────────────── el servidor, simulado

const explicaciones: Record<string, string> = {
  comentar: 'En tu Studio, esto queda en el Buzón del director (o en Preguntas). Lo puedes corregir o borrar hasta la revisión; el director lo lee todo junto, responde cada nota y dice qué hizo con ella.',
  entregar: 'Misión completada: al marcar su último paso, en tu Studio la misión queda entregada y lo que leíste queda sellado. En su revisión, el director la aprueba o te dice qué rehacer, y te deja la misión siguiente.',
  empezar: 'En tu Studio, la misión queda marcada como empezada, con tu nombre.',
  responder_propuesta: 'En tu Studio, tu respuesta a la propuesta queda firmada con tu nombre. Si la aceptas, el director la vuelve trabajo en su próxima revisión.',
  marcar: 'En tu Studio, tu decisión sobre el criterio queda firmada y manda sobre la evaluación del director.',
  cerrar_fase: 'Cruzar la puerta: en tu Studio, la fase se cierra con tu firma y la ruta avanza a la siguiente. Solo tú la cruzas.',
  fijar_objetivo: 'En tu Studio, la meta queda fijada con tu nombre y la fecha. Desde ahí, todo se mide contra ella y el director traza la ruta.',
  revision: 'Pedir revisión: tu Studio llama al director en ese momento (tu agente, sin pantalla): lee todo lo pendiente, responde y deja tu misión siguiente. Mientras no pidas nada, ningún modelo corre.',
  proyecto: 'Entregar un proyecto: en tu Studio eliges su carpeta y listo. El Studio abre su memoria en su propio repositorio (una rama aparte, «stl») y el director lo diagnostica.',
  otro: 'En tu Studio, esto se guarda en la memoria del proyecto (en su propio repositorio), firmado con tu nombre.',
};

function explicacion(ruta: string, cuerpo: Record<string, unknown>): string {
  if (ruta === '/revision') return explicaciones.revision;
  if (ruta.startsWith('/proyecto') || ruta === '/escanear') return explicaciones.proyecto;
  if (ruta === '/activo') return 'En tu Studio, aquí cambias de proyecto: cada uno con su buzón, su ruta y su historia, y el director te dice dónde quedaron.';
  return explicaciones[String(cuerpo.tipo ?? '')] ?? explicaciones.otro;
}

const fetchReal = window.fetch.bind(window);
window.fetch = async (entrada: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url, location.href);
  if (!url.pathname.includes('/__estudio/director')) return fetchReal(entrada, init);
  const ruta = url.pathname.replace(/^.*\/__estudio\/director/, '') || '/';
  const json = (x: unknown, codigo = 200) => new Response(JSON.stringify(x), { status: codigo, headers: { 'Content-Type': 'application/json' } });
  if ((init?.method ?? 'GET').toUpperCase() === 'GET') {
    if (ruta === '/') return json(datosDemo());
    if (ruta === '/documentos') return json({ documentos: documentosDemo() });
    if (ruta === '/documento') {
      const pedido = url.searchParams.get('ruta');
      const texto = documentoDemo(pedido);
      return texto ? json({ ruta: pedido, texto }) : json({ error: 'En la demostración solo están la ruta y el diagnóstico.' }, 404);
    }
    if (ruta === '/escanear/fuentes') return json({ agentes: [], unidades: [] });
    if (ruta === '/carpetas') return json({ ruta: null, padre: null, git: false, carpetas: [], inicios: [] });
    if (ruta === '/salud') return json([]);
    return json({ error: 'No está en la demostración.' }, 404);
  }
  // Lo que cambiaría algo: no se guarda, se explica. El error vacío hace que el Studio no muestre ningún aviso suyo
  let cuerpo: Record<string, unknown> = {};
  try {
    cuerpo = JSON.parse(String(init?.body ?? '{}'));
  } catch { /* sin cuerpo */ }
  explicar(explicacion(ruta, cuerpo));
  return json({ error: '' }, 400);
};

/** Una tarjeta encima de todo (también de los diálogos del Studio): qué pasaría aquí en tu Studio. */
function explicar(texto: string) {
  const dlg = document.createElement('dialog');
  dlg.className = 'demo-explica';
  dlg.innerHTML = `<p class="demo-sobre">Es una demostración: aquí no se guarda nada</p><p>${texto}</p><div class="demo-botones"><button type="button" class="primario" data-cerrar>Entendido</button></div>`;
  document.body.append(dlg);
  dlg.querySelector('[data-cerrar]')!.addEventListener('click', () => dlg.close());
  dlg.addEventListener('close', () => dlg.remove());
  dlg.showModal();
}

// ───────────────────────────────────────────── el recorrido guiado

interface Paso { titulo: string; texto: string; sel?: string; vista?: string }
const PASOS: Paso[] = [
  { titulo: 'Bienvenido al STL Studio', texto: 'Esta es la interfaz real, con un proyecto de ejemplo: «Rueda Libre», la tienda en línea de un taller de bicicletas. Puedes recorrerla y oprimir lo que quieras: nada se guarda, y si algo cambiaría tu proyecto, te explico qué pasaría.' },
  { vista: 'misiones', sel: '#mando', titulo: 'Siempre sabes dónde estás', texto: 'El proyecto, la sección y la fase de la ruta. La barra muestra cuántos criterios faltan para cruzar la puerta de la fase. Queda fija al bajar.' },
  { vista: 'misiones', sel: '[data-donde-quedamos]', titulo: '¿Dónde quedamos?', texto: 'En qué quedamos, lo que avanzamos y los comentarios del director en su última revisión se leen aquí, como un juego: tocas cada línea al leerla. El botón avisa cuando hay algo nuevo; la pantalla queda para tu misión.' },
  { vista: 'misiones', sel: '.mision-c.sigue', titulo: 'Una sola misión, completa', texto: 'Tu paso de ahora, con su porqué, sus pasos y un botón a cada lugar. Las demás misiones esperan en cola: una a la vez, para no dispersarte.' },
  { vista: 'misiones', sel: '.al-director', titulo: 'Comentas donde estás', texto: 'Cada misión, cada paso y cada parte de un documento tiene «Comentar al director». Escrito o en voz: lo que digas no le llega al modelo todavía, espera en el Buzón.' },
  { vista: 'buzon', sel: '#vista', titulo: 'El Buzón: piensa, corrige y luego envía', texto: 'Aquí esperan tus comentarios hasta la revisión. Los relees, los corriges o los borras: lo que borres nunca le llega al modelo. Debajo, cada nota con su respuesta y lo que el director hizo con ella.' },
  { vista: 'buzon', sel: '.acciones-cabeza', titulo: 'Pedir revisión', texto: 'Cuando quieras, pides la revisión. El director (tu agente de código, Claude Code o Codex, en la carpeta del Studio) lo lee todo junto, lo ordena contra la meta, responde cada nota y te deja la misión siguiente.' },
  { vista: 'preguntas', sel: '#vista', titulo: 'Preguntas, aparte', texto: 'Las dudas que se te ocurren en medio del trabajo, sin cortarlo. El director las responde en su revisión, como conversaciones que puedes seguir.' },
  { vista: 'documentos', sel: '.lector, .docs', titulo: 'Documentos por partes', texto: 'El director escribe por partes, y cada parte se comenta aparte. Las decisiones van al final de la parte que las explica, cada una con su botón para responderla.' },
  { vista: 'ruta', sel: '#vista', titulo: 'La ruta, con puertas', texto: 'Fases hacia la meta. Cada una tiene su puerta y sus criterios al 100 %, y lo que hace cada frente: en foco, de apoyo o en espera. La puerta la cruzas tú.' },
  { vista: 'propuestas', sel: '#vista', titulo: 'El director propone, tú decides', texto: 'Lo que mejoraría el proyecto llega como propuesta, con el problema y lo que conecta. Solo lo que aceptas se vuelve trabajo, en su fase.' },
  { vista: 'misiones', sel: '#atajos-director', titulo: 'Atajos junto a la cara del director', texto: 'Anotar una pregunta o dejar un comentario, desde cualquier sección, y, en tu misión o en un documento, el modo enfoque: solo lo de ahora a la vista. Y la cara del director te lleva a tu siguiente pendiente.' },
  { titulo: 'Úsalo con tus proyectos', texto: `El Studio es gratuito y corre en tu computador, con tu agente de código y tu propia cuenta. La memoria de cada proyecto queda en su propio repositorio. Se instala bajándolo y pidiéndole a tu agente «inicializa STL Studio». <a href="${PUBLICA}" target="_blank" rel="noopener noreferrer">La metodología completa ↗</a>` },
];

let actual = -1;
const capa = document.createElement('div');
capa.className = 'demo-recorrido';
capa.hidden = true;
capa.innerHTML = '<div class="demo-foco"></div><div class="demo-tarjeta" role="dialog" aria-live="polite"></div>';
const foco = capa.querySelector<HTMLElement>('.demo-foco')!;
const tarjeta = capa.querySelector<HTMLElement>('.demo-tarjeta')!;

function ubicar() {
  if (actual < 0) return;
  const p = PASOS[actual];
  const el = p.sel ? document.querySelector<HTMLElement>(p.sel) : null;
  const r = el?.getBoundingClientRect();
  // Solo la parte visible, y como mucho la mitad de la pantalla: un elemento alto no saca nada de la vista
  const arriba = (document.querySelector<HTMLElement>('#mando')?.getBoundingClientRect().bottom ?? 0) + 8;
  const m = 6;
  let caja: { top: number; bottom: number; left: number; right: number } | null = null;
  const altoTarjeta = tarjeta.getBoundingClientRect().height;
  if (r && r.width > 0 && r.height > 0) {
    // lo que está dentro de la cabecera fija se resalta ahí mismo; lo demás, por debajo de ella
    const top = Math.max(r.top, el!.closest('#mando') ? 8 : arriba);
    // y deja lugar para la tarjeta debajo
    const bottom = Math.min(r.bottom, innerHeight - 8, top + innerHeight * 0.5, Math.max(top + 60, innerHeight - altoTarjeta - 40));
    if (bottom - top > 16) caja = { top, bottom, left: Math.max(8, r.left), right: Math.min(innerWidth - 8, r.right) };
  }
  foco.hidden = !caja;
  capa.classList.toggle('sin-foco', !caja);
  if (caja) Object.assign(foco.style, { left: `${caja.left - m}px`, top: `${caja.top - m}px`, width: `${caja.right - caja.left + m * 2}px`, height: `${caja.bottom - caja.top + m * 2}px` });
  // La tarjeta, debajo del resaltado si cabe; si no, encima; si tampoco, abajo de la pantalla. Sin resaltado, al centro
  const t = tarjeta.getBoundingClientRect();
  let x = innerWidth / 2 - t.width / 2;
  let y = innerHeight / 2 - t.height / 2;
  if (caja) {
    const abajo = caja.bottom + m + 14;
    const encima = caja.top - m - 14 - t.height;
    y = abajo + t.height <= innerHeight - 12 ? abajo : encima >= 12 ? encima : innerHeight - t.height - 12;
    x = Math.min(Math.max(12, caja.left), innerWidth - t.width - 12);
  }
  Object.assign(tarjeta.style, { left: `${x}px`, top: `${Math.max(12, y)}px` });
}

async function mostrar(i: number) {
  actual = i;
  const p = PASOS[i];
  if (p.vista) document.querySelector<HTMLElement>(`.navegacion [data-vista="${p.vista}"]`)?.click();
  await new Promise((r) => setTimeout(r, p.vista ? 450 : 0));
  const el = p.sel ? document.querySelector<HTMLElement>(p.sel) : null;
  if (el && p.sel !== '#mando') {
    const cabeza = document.querySelector<HTMLElement>('#mando')?.offsetHeight ?? 0;
    const r = el.getBoundingClientRect();
    const fuera = r.top < cabeza + 12 || r.bottom > innerHeight - 220;
    if (fuera) window.scrollTo({ top: window.scrollY + r.top - cabeza - 16 - (r.height < innerHeight * 0.4 ? innerHeight * 0.15 : 0) });
  }
  tarjeta.innerHTML = `<span class="demo-paso">Paso ${i + 1} de ${PASOS.length}</span><h3>${p.titulo}</h3><p>${p.texto}</p>
    <div class="demo-botones">${i ? '<button type="button" data-paso="-1">← Anterior</button>' : ''}<button type="button" data-salir>Salir</button><button type="button" class="primario" data-paso="1">${i === PASOS.length - 1 ? 'Terminar' : 'Siguiente →'}</button></div>`;
  capa.hidden = false;
  setTimeout(ubicar, 350);
  tarjeta.querySelector<HTMLElement>('.primario')?.focus({ preventScroll: true });
}

function cerrar() {
  actual = -1;
  capa.hidden = true;
  localStorage.setItem('stl.demo.recorrido', 'visto');
}

capa.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>('button');
  if (!b) return;
  if (b.dataset.salir !== undefined) return cerrar();
  const siguiente = actual + Number(b.dataset.paso);
  if (siguiente >= PASOS.length) return cerrar();
  void mostrar(Math.max(0, siguiente));
});
document.addEventListener('keydown', (e) => {
  if (actual < 0) return;
  if (e.key === 'Escape') cerrar();
  else if (e.key === 'ArrowRight') tarjeta.querySelector<HTMLElement>('[data-paso="1"]')?.click();
  else if (e.key === 'ArrowLeft') tarjeta.querySelector<HTMLElement>('[data-paso="-1"]')?.click();
});
addEventListener('resize', ubicar);
addEventListener('scroll', ubicar, { passive: true });

// Siempre a la vista: que es una demostración y cómo volver al recorrido
const cinta = document.createElement('div');
cinta.className = 'demo-cinta';
cinta.innerHTML = '<b>Demostración</b><span>Un proyecto de ejemplo: nada se guarda.</span><button type="button" class="primario" data-recorrido>▶ Recorrido guiado</button>';
cinta.querySelector('[data-recorrido]')!.addEventListener('click', () => void mostrar(0));

// ───────────────────────────────────────────── arrancar

document.body.classList.add('modo-demo');
localStorage.setItem('estudio.director.pestana', 'misiones'); // la demostración empieza por Hoy
await import('../src/director');
document.body.append(capa, cinta);
// Cuando el Studio terminó de pintar (y se cerró «Dónde quedamos», si apareció), el recorrido empieza solo la primera vez
const esperar = setInterval(() => {
  if (!document.querySelector('#mando')?.children.length || document.querySelector('dialog[open]')) return;
  clearInterval(esperar);
  if (localStorage.getItem('stl.demo.recorrido') !== 'visto') void mostrar(0);
}, 250);
