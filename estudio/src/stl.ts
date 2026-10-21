// «Qué es STL»: la metodología explicada para quien llega nuevo, y la guía de uso del Studio. Es la misma para todos
// los proyectos (y se ve aunque todavía no haya ninguno). No es una página larga: es un recorrido por paradas, una a la
// vez, con poco texto y casi todo en gráficos del mismo estilo (el de «La idea»: insignias de color con su ícono
// blanco, cajas suaves y flechas). Las paradas responden lo que hay que entender: el problema de trabajar directo con el
// modelo, cómo funciona el flujo (tú, el Studio, el director y el modelo), su novedad (tú te quedas en el paso que
// sigue y todo lo que se te ocurre entra sin sacarte del cauce), los principios en el flujo, cuándo no aplica y cómo
// empezar. Sin comparaciones con otras metodologías: la página explica STL, no compite.
// El recorrido funciona sin JavaScript (un radio por parada y :has() en CSS) y, sin CSS, se lee entero de corrido: la
// versión pública (tools/publicar-stl.ts) es la misma página. La versión larga, para leer y comentar, está en
// docs/metodo/metodologia.md.
import { icono, type Icono } from './iconos';

// Los colores de los actores, los mismos en todos los gráficos. Van también como texto (el nombre de cada momento) y bajo
// un ícono blanco: 4,5:1 sobre el papel claro y 3:1 con el blanco (estilos.test.ts; antes modelo #0f8a7a, ok #23895c y
// tenue #8d96a8 no llegaban)
const COLOR = { tu: '#2f5fb3', studio: '#5b4fd6', director: '#2c2c2a', modelo: '#0b7365', alerta: '#c0502a', ruta: '#7a4fd1', ok: '#1b7449', tenue: '#7b8496' } as const;
const COLOR_STUDIO = COLOR.studio;

/**
 * La metodología en un gráfico, como una infografía. Arriba, quién la hace: el Studio y el director, una IA (nunca se
 * dibuja como persona). En medio, el flujo: mientras trabajas en tu misión surgen ideas, comentarios, preguntas y
 * ajustes, cada uno abre una rama, el Studio y el director los convierten en un plan y cada aporte cae en su fase de la
 * línea, con sus puertas, hasta la meta; tú ves solo la de ahora. Abajo, el resultado y lo que hace cada uno. El flujo
 * tiene su versión ancha y la del teléfono; lo demás es HTML y se acomoda solo. Es el estilo de todos los gráficos.
 */
type Aporte = 'idea' | 'comentario' | 'pregunta' | 'ajuste';
// Cada tipo de aporte, con su ejemplo y la fase donde lo pone el director (índice de FASES). Su nombre va en su color
// sobre su fondo: 4,5:1 (antes las ideas, #b7791f, a 3,4:1, y los comentarios, #23895c, a 3,9:1)
const APORTES: Record<Aporte, { nombre: string; corto: string; color: string; fondo: string; ejemplo: [string, string]; fase: number }> = {
  idea: { nombre: 'Ideas nuevas', corto: 'Ideas', color: '#8f5d12', fondo: '#fdf5e2', ejemplo: ['Por ejemplo: validar', 'los datos al guardar'], fase: 1 },
  comentario: { nombre: 'Comentarios', corto: 'Comentarios', color: '#1b7449', fondo: '#e9f5ee', ejemplo: ['Por ejemplo: el botón', 'de guardar no se ve'], fase: 0 },
  pregunta: { nombre: 'Preguntas', corto: 'Preguntas', color: '#2f63c9', fondo: '#e9effb', ejemplo: ['Por ejemplo: ¿y si', 'falla el pago?'], fase: 0 },
  ajuste: { nombre: 'Ajustes', corto: 'Ajustes', color: '#7a4fd1', fondo: '#f1ebfb', ejemplo: ['Por ejemplo: poner al', 'día las librerías'], fase: 3 },
};
const TIPOS = Object.keys(APORTES) as Aporte[];
// [nombre, color]: las fases de un proyecto de software, con una puerta entre una y otra. Su número va en ese color sobre
// el blanco: 4,5:1 (antes Pruebas, #0f8a7a, y Despliegue, #c8691a, no llegaban)
const FASES: [string, string][] = [['Diseño', '#2f63c9'], ['Desarrollo', '#7a4fd1'], ['Pruebas', '#0b7365'], ['Despliegue', '#a4540f']];

function persona(x: number, y: number) {
  return `<g class="l-persona"><circle cx="${x}" cy="${y - 24}" r="11"/><path d="M${x - 20} ${y + 14}v-8a20 16 0 0 1 40 0v8z"/></g>`;
}
const portatil = (x: number, y: number) => `<path class="l-portatil" d="M${x + 4} ${y + 14}h30l7-20h-30z"/>`;
const codigo = (x: number, y: number, r = 18) => `<circle class="l-codigo" cx="${x}" cy="${y}" r="${r}"/><text class="l-codigo-t" x="${x}" y="${y + 4.5}" text-anchor="middle">&lt;/&gt;</text>`;
const bandera = (x: number, y: number) => `<line class="g-asta" x1="${x}" y1="${y}" x2="${x}" y2="${y + 50}"/><path class="g-bandera" d="M${x} ${y}h32l-9 11 9 11h-32z"/>`;

// Los íconos, dibujados alrededor de (x, y) para un círculo de radio 24 (los de los aportes, de radio 13): el Studio es
// una caja; el director, unos destellos, porque es una IA y no una persona; tú, una persona; el modelo, código; la
// meta, una diana
const estrella = (x: number, y: number, r: number) => `M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}z`;
const GLIFO = {
  studio: (x: number, y: number) => `<path class="i-trazo" d="M${x} ${y - 12}l10.4 6v12l-10.4 6-10.4-6v-12zM${x - 10.4} ${y - 6}l10.4 6 10.4-6M${x} ${y}v12"/>`,
  director: (x: number, y: number) => `<path class="i-lleno" d="${estrella(x - 2, y + 2, 13)}${estrella(x + 9, y - 9, 5.5)}"/>`,
  tu: (x: number, y: number) => `<circle class="i-lleno" cx="${x}" cy="${y - 5}" r="5.5"/><path class="i-lleno" d="M${x - 10} ${y + 11}a10 8.5 0 0 1 20 0z"/>`,
  modelo: (x: number, y: number) => `<text class="i-codigo" x="${x}" y="${y + 5}" text-anchor="middle">&lt;/&gt;</text>`,
  meta: (x: number, y: number) => `<circle class="i-trazo" cx="${x}" cy="${y}" r="11"/><circle class="i-trazo" cx="${x}" cy="${y}" r="5.5"/><circle class="i-lleno" cx="${x}" cy="${y}" r="1.8"/>`,
};
const GLIFO_APORTE: Record<Aporte, (x: number, y: number) => string> = {
  idea: (x, y) => `<circle class="i-lleno" cx="${x}" cy="${y - 2}" r="5"/><rect class="i-lleno" x="${x - 2.5}" y="${y + 3.5}" width="5" height="3.5" rx="1"/>`,
  comentario: (x, y) => `<path class="i-lleno" d="M${x - 7} ${y - 7}h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-8l-4 4v-4h-2a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z"/>`,
  pregunta: (x, y) => `<text class="i-letra" x="${x}" y="${y + 5.5}" text-anchor="middle">?</text>`,
  ajuste: (x, y) => `<circle class="i-engrane" cx="${x}" cy="${y}" r="6"/><circle class="i-lleno" cx="${x}" cy="${y}" r="2.2"/>`,
};
const insignia = (x: number, y: number, r: number, color: string, glifo: string) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/>${glifo}`;
// Una insignia suelta, en HTML: la de cada actor, o una con un ícono del Studio (iconos.ts), blanco sobre su color
const icono48 = (color: string, glifo: string) => `<svg class="idea-icono" viewBox="0 0 48 48" aria-hidden="true">${insignia(24, 24, 24, color, glifo)}</svg>`;
const ficha = (color: string, ic: Icono) => `<span class="ficha-stl" style="--c: ${color}" aria-hidden="true">${icono(ic)}</span>`;
const ACTOR = {
  tu: () => icono48(COLOR.tu, GLIFO.tu(24, 24)),
  studio: () => icono48(COLOR.studio, GLIFO.studio(24, 24)),
  director: () => icono48(COLOR.director, GLIFO.director(24, 24)),
  modelo: () => icono48(COLOR.modelo, GLIFO.modelo(24, 24)),
  meta: () => icono48(COLOR.studio, GLIFO.meta(24, 24)),
};

/** El Studio y el director, juntos en una caja que convierte los aportes en un plan: (x, y), su esquina; w, su ancho */
function pareja(x: number, y: number, w: number) {
  const a = x + w / 4, b = x + (3 * w) / 4, m = x + w / 2, ancha = w >= 300, h = ancha ? 186 : 196;
  const lado = (cx: number, n: string, color: string, sub: [string, string]) => `<text class="l-par-n" x="${cx}" y="${y + 104}" text-anchor="middle" fill="${color}">${n}</text>
      ${sub.map((s, i) => `<text class="l-par-t" x="${cx}" y="${y + 121 + i * 14}" text-anchor="middle">${s}</text>`).join('')}`;
  return `<rect class="l-caja" x="${x}" y="${y}" width="${w}" height="${h}" rx="16"/>
      ${insignia(a, y + 56, 24, COLOR_STUDIO, GLIFO.studio(a, y + 56))}${insignia(b, y + 56, 24, COLOR.director, GLIFO.director(b, y + 56))}
      <path class="l-par" d="M${m - 12} ${y + 51}H${m + 12}M${m + 7} ${y + 47}L${m + 12} ${y + 51}L${m + 7} ${y + 55}M${m + 12} ${y + 62}H${m - 12}M${m - 7} ${y + 58}L${m - 12} ${y + 62}L${m - 7} ${y + 66}"/>
      ${lado(a, 'STL Studio', COLOR_STUDIO, ['recibe y detiene', 'lo que dices'])}${lado(b, 'El director', COLOR.director, ['una IA: decide', 'y ordena'])}
      <line class="l-caja-sep" x1="${x}" y1="${y + 150}" x2="${x + w}" y2="${y + 150}"/>
      ${(ancha ? ['Juntos convierten las ideas en un plan'] : ['Juntos convierten', 'las ideas en un plan']).map((l, i) => `<text class="l-par-junto" x="${m}" y="${y + (ancha ? 172 : 168) + i * 15}" text-anchor="middle">${l}</text>`).join('')}`;
}

function graficoSTL() {
  // Las puntas de las flechas, del color de cada aporte (s distingue las del ancho y las del teléfono: los ids no se repiten)
  const puntas = (s: string) => TIPOS.map((t) => `<marker id="punta-${t}${s}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="3.4" markerHeight="3.4" orient="auto"><path d="M0 0L10 5L0 10z" fill="${APORTES[t].color}"/></marker>`).join('');
  // Cuántos aportes caen en la misma fase, para que sus flechas no lleguen al mismo punto
  const corrimiento = (t: Aporte, paso: number) => {
    const mismos = TIPOS.filter((u) => APORTES[u].fase === APORTES[t].fase);
    return (mismos.indexOf(t) - (mismos.length - 1) / 2) * paso;
  };

  // ── ancho: tú, los cuatro tipos de aporte, el Studio y el director, y la línea con cada aporte en su fase
  const yc = 218, ya = (i: number) => 116 + i * 66, xf = (k: number) => 806 + k * 76, yl = 306;
  const ramas = TIPOS.map((t, i) => {
    const a = APORTES[t], y = ya(i), yt = yc + (i - 1.5) * 26;
    return `<path class="l-rio" stroke="${a.color}" d="M138 ${yc}C166 ${yc} 160 ${y} 194 ${y}"/>
      <path class="l-rio" stroke="${a.color}" d="M466 ${y}C496 ${y} 490 ${yt} 520 ${yt}"/>
      <rect x="190" y="${y - 16}" width="126" height="32" rx="16" fill="${a.fondo}" stroke="${a.color}" stroke-width="1.5"/>${insignia(207, y, 13, a.color, GLIFO_APORTE[t](207, y))}
      <text class="l-tipo" x="226" y="${y + 4.5}" fill="${a.color}">${a.nombre}</text>
      <rect class="l-ejemplo" x="326" y="${y - 21}" width="140" height="42" rx="9"/>
      ${a.ejemplo.map((l, k) => `<text class="l-texto" x="336" y="${y - 3 + k * 15}">${l}</text>`).join('')}`;
  }).join('');
  let xc = 786;
  const chips = TIPOS.map((t) => {
    const a = APORTES[t], w = Math.round(a.corto.length * 6.9 + 30), x = xc, medio = x + w / 2, tx = xf(a.fase) + 34 + corrimiento(t, 18);
    xc += w + 8;
    return `<rect x="${x}" y="80" width="${w}" height="26" rx="8" fill="${a.fondo}" stroke="${a.color}" stroke-width="1.5"/><circle cx="${x + 12}" cy="93" r="4.5" fill="${a.color}"/><text class="l-tipo" x="${x + 22}" y="97.5" fill="${a.color}">${a.corto}</text>
      <path class="l-rio" stroke="${a.color}" d="M${medio} 106C${medio} 170 ${tx} 168 ${tx} 233" marker-end="url(#punta-${t})"/>`;
  }).join('');
  const fases = FASES.map(([n, c], k) => {
    const x = xf(k), m = x + 34;
    return `<g${k ? ' class="l-espera"' : ''}><rect class="l-fase${k ? '' : ' ahora'}" x="${x}" y="238" width="68" height="46" rx="9"/>
      <text class="l-fase-n" x="${m}" y="257" text-anchor="middle" fill="${c}">Fase ${k + 1}</text><text class="l-fase-t" x="${m}" y="274" text-anchor="middle">${n}</text>
      <line x1="${m}" y1="284" x2="${m}" y2="${yl - 7}" stroke="${c}" stroke-width="2"/><circle cx="${m}" cy="${yl}" r="7" fill="${c}"/></g>
      ${k < FASES.length - 1 ? `<line class="g-puerta" x1="${x + 72}" y1="${yl - 12}" x2="${x + 72}" y2="${yl + 12}"/>` : ''}`;
  }).join('');
  const ancho = `<div class="lienzo-stl solo-ancho"><svg viewBox="0 0 1180 390" role="img" aria-labelledby="titulo-linea">
      <title id="titulo-linea">Mientras trabajas en tu misión surgen ideas nuevas, comentarios, preguntas y ajustes, y cada uno abre una rama. Todos llegan al Studio, que los recibe y los detiene, y al director, una IA, que los convierte en un plan: pone cada aporte en su fase de la línea (diseño, desarrollo, pruebas y despliegue, con una puerta entre una y otra) hasta la meta. Tú ves solo la fase de ahora; lo demás espera su turno, ya en su lugar.</title>
      <defs>${puntas('')}</defs>
      ${ramas}
      ${persona(50, yc)}${portatil(50, yc)}${codigo(120, yc)}
      <text class="g-titulo" x="50" y="${yc + 44}" text-anchor="middle">Tú</text>
      <text class="g-suave" x="50" y="${yc + 61}" text-anchor="middle">en tu misión,</text>
      <text class="g-suave" x="50" y="${yc + 77}" text-anchor="middle">sin distraerte</text>
      ${pareja(520, 120, 210)}
      <path class="l-linea" d="M730 ${yc}C764 ${yc} 760 ${yl} 790 ${yl}H1122"/>
      <circle class="l-inicio" cx="790" cy="${yl}" r="7"/>
      <text class="g-titulo" x="786" y="64">Todo en su lugar</text>
      ${chips}${fases}
      <text class="l-ahora-t" x="${xf(0) + 34}" y="${yl + 30}" text-anchor="middle">Ahora</text>
      <text class="g-suave" x="${xf(2) + 34}" y="${yl + 30}" text-anchor="middle">lo demás espera su turno</text>
      <path class="l-llave" d="M790 ${yl + 40}v6H1102v-6M946 ${yl + 46}v6"/>
      <text class="g-etiqueta" x="946" y="${yl + 72}" text-anchor="middle">La información, en el momento correcto</text>
      ${bandera(1122, yl - 50)}
      <text class="g-etiqueta g-fuerte l-verde" x="1172" y="${yl - 60}" text-anchor="end">La meta</text>
    </svg></div>`;

  // ── teléfono: de arriba abajo; los aportes bajan por la derecha hasta el Studio y el director, y la línea, por la izquierda
  const ym = (i: number) => 160 + i * 64, yk = (k: number) => 664 + k * 72;
  const ramasM = TIPOS.map((t, i) => {
    const a = APORTES[t], y = ym(i), rx = 354 - i * 4, yIn = 420 + (3 - i) * 12;
    return `<path class="l-rio" stroke="${a.color}" d="M44 ${y - 14}Q44 ${y} 58 ${y}H72"/>
      <path class="l-rio" stroke="${a.color}" d="M334 ${y}H${rx}V${yIn}H340"/>
      <rect x="70" y="${y - 16}" width="120" height="32" rx="16" fill="${a.fondo}" stroke="${a.color}" stroke-width="1.5"/>${insignia(86, y, 13, a.color, GLIFO_APORTE[t](86, y))}
      <text class="l-tipo" x="104" y="${y + 4.5}" fill="${a.color}">${a.nombre}</text>
      <rect class="l-ejemplo" x="196" y="${y - 21}" width="138" height="42" rx="9"/>
      ${a.ejemplo.map((l, k) => `<text class="l-texto" x="205" y="${y - 3 + k * 15}">${l}</text>`).join('')}`;
  }).join('');
  const fasesM = FASES.map(([n, c], k) => {
    const y = yk(k);
    return `<g${k ? ' class="l-espera"' : ''}><line x1="60" y1="${y + 24}" x2="84" y2="${y + 24}" stroke="${c}" stroke-width="2"/><circle cx="60" cy="${y + 24}" r="7" fill="${c}"/>
      <rect class="l-fase${k ? '' : ' ahora'}" x="84" y="${y}" width="112" height="48" rx="9"/>
      <text class="l-fase-n" x="96" y="${y + 20}" fill="${c}">Fase ${k + 1}</text><text class="l-fase-t" x="96" y="${y + 37}">${n}</text></g>
      ${k < FASES.length - 1 ? `<line class="g-puerta" x1="48" y1="${y + 60}" x2="72" y2="${y + 60}"/>` : ''}`;
  }).join('');
  const chipsM = TIPOS.map((t) => {
    const a = APORTES[t], y = yk(a.fase) + 24 + corrimiento(t, 26);
    return `<rect x="222" y="${y - 11}" width="118" height="22" rx="8" fill="${a.fondo}" stroke="${a.color}" stroke-width="1.5"/><circle cx="234" cy="${y}" r="4.5" fill="${a.color}"/><text class="l-tipo" x="244" y="${y + 4.5}" fill="${a.color}">${a.corto}</text>
      <path class="l-rio" stroke="${a.color}" d="M222 ${y}H201" marker-end="url(#punta-${t}-m)"/>`;
  }).join('');
  const movil = `<div class="lienzo-stl solo-movil"><svg viewBox="0 0 360 1000" role="img" aria-labelledby="titulo-linea-m">
      <title id="titulo-linea-m">Mientras trabajas en tu misión surgen ideas, comentarios, preguntas y ajustes. Llegan al Studio y al director, una IA, que los convierten en un plan: cada aporte cae en su fase de la línea, con sus puertas, hasta la meta. Tú ves solo la fase de ahora.</title>
      <defs>${puntas('-m')}</defs>
      <line class="l-tronco" x1="44" y1="124" x2="44" y2="${ym(3) - 14}"/>
      ${ramasM}
      ${persona(44, 52)}${portatil(44, 52)}${codigo(44, 108, 16)}
      <text class="g-titulo" x="100" y="44">Tú</text>
      <text class="g-suave" x="100" y="62">en tu misión, sin distraerte</text>
      ${pareja(20, 410, 320)}
      <path class="l-linea" d="M180 596C180 630 60 612 60 640V940"/>
      <circle class="l-inicio" cx="60" cy="640" r="7"/>
      <text class="g-titulo" x="200" y="628">Todo en su lugar</text>
      ${fasesM}${chipsM}
      <text class="l-ahora-t" x="48" y="${yk(0) + 29}" text-anchor="end">Ahora</text>
      ${bandera(60, 940)}
      <text class="g-etiqueta g-fuerte l-verde" x="104" y="956">La meta</text>
      <text class="g-suave" x="104" y="976">La información, en el momento correcto</text>
    </svg></div>`;

  // Lo de arriba y lo de abajo van en HTML: se acomodan solos a cualquier ancho
  const studio = ACTOR.studio(), director = ACTOR.director(), tu = ACTOR.tu(), meta = ACTOR.meta();
  const rol = (ic: string, n: string, xs: string[]) => `<div class="idea-rol">${ic}<div><b>${n}</b><ul>${xs.map((x) => `<li>${x}</li>`).join('')}</ul></div></div>`;
  return `<figure class="grafico-stl grafico-linea">
    <div class="idea-cabecera">
      <div class="idea-intro"><b class="idea-titulo">Ideas que se convierten en progreso</b><p>El Studio y el director, una IA, reciben cada idea, comentario, pregunta y ajuste, y lo ponen en el momento exacto del proyecto en que debe aplicarse.</p></div>
      <div class="idea-suma">
        <div class="idea-actor">${studio}<div><b>STL Studio</b><span>Recibe lo que dices, escrito o en voz, y lo detiene hasta que lo das por bueno.</span></div></div>
        <span class="idea-signo" aria-hidden="true">+</span>
        <div class="idea-actor">${director}<div><b>El director</b><span>Una IA que analiza, decide y pone cada aporte en su lugar de la línea.</span></div></div>
      </div>
      <span class="idea-signo flecha" aria-hidden="true">→</span>
      <div class="idea-juntos">${meta}<span>Juntos convierten el caos de ideas en <b>un plan claro y ordenado</b>.</span></div>
    </div>
    ${ancho}${movil}
    <div class="idea-resultado"><span class="idea-check" aria-hidden="true">✓</span><div><b><span>El resultado:</span> se tiene en cuenta todo, pero en orden.</b><p>Tú sigues en tu misión; cada aporte llega al punto de la línea donde aporta más, y la línea nunca vuelve atrás.</p></div></div>
    <div class="idea-cada"><b class="idea-cada-t"><span aria-hidden="true">★</span> ¿Qué hace cada uno?</b>
      <div class="idea-roles">
        ${rol(studio, 'STL Studio', ['Recibe lo que dices, escrito o en voz.', 'Lo detiene en el buzón: lo relees, corriges o borras.', 'Guarda la historia y el porqué de cada decisión.'])}
        ${rol(director, 'El director (IA)', ['Lee todo junto, contra la meta.', 'Integra, aplaza o descarta, con su razón.', 'Le pasa al modelo solo lo aprobado.'])}
        ${rol(tu, 'Tú', ['Te enfocas en tu misión de ahora.', 'Lo demás espera, ya en su lugar.', 'Tienes la última palabra.'])}
        <div class="idea-juntos idea-final">${meta}<span>Más contexto + mejor decisión = <b>más avance</b>.</span></div>
      </div>
    </div>
  </figure>`;
}

/** Una flecha con su rótulo: hacia la derecha (ida, hacia el modelo) o hacia la izquierda (vuelta, hacia ti) */
const flecha = (texto: string, sentido: 'ida' | 'vuelta') =>
  `<span class="flecha-stl ${sentido}"><i aria-hidden="true">${sentido === 'ida' ? '↓' : '↑'}</i>${texto}</span>`;
const nodo = (ic: string, n: string, sub = '', extra = '') => `<div class="nodo-stl">${ic}<b>${n}</b>${sub ? `<small>${sub}</small>` : ''}${extra}</div>`;
/** Una secuencia de pasos con su insignia, unidos por flechas: [título, detalle, ícono, color] */
const tira = (pasos: [string, string, Icono, string][], clase = '') =>
  `<ol class="tira-stl${clase ? ` ${clase}` : ''}">${pasos.map(([t, x, ic, c]) => `<li>${ficha(c, ic)}<b>${t}</b><span>${x}</span></li>`).join('')}</ol>`;
const resultado = (titulo: string, texto: string) =>
  `<div class="idea-resultado"><span class="idea-check" aria-hidden="true">✓</span><div><b>${titulo}</b>${texto ? `<p>${texto}</p>` : ''}</div></div>`;
const enlace = (texto: string, url: string) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${texto}</a>`;

// ── Parada 1: el problema. Hoy hablas directo con el modelo, y eso trae estos golpes: [qué pasa, en pocas palabras, ícono]
const GOLPES: [string, string, Icono][] = [
  ['Se ejecuta al instante', 'antes de pensarlo dos veces', 'reloj'],
  ['Corregir contamina', 'la versión equivocada sigue ahí', 'escribir'],
  ['Lo aprobado vuelve', 'el modelo reescribe lo revisado', 'documentos'],
  ['Nadie decide qué sigue', 'te sigue a donde vayas', 'ruta'],
  ['Cada mensaje carga todo', 'diez ideas, diez turnos', 'esfuerzo'],
];
// [la cifra, lo que dice, la fuente, su enlace]: por qué no es un caso aislado
const CIFRAS: [string, string, string, string][] = [
  ['+19 %', 'de tiempo les tomó a desarrolladores con experiencia trabajar con IA, y creían haber ido un 20 % más rápido', 'METR, 2025', 'https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/'],
  ['2 min', 'entre una interrupción y otra para quien trabaja en computador; casi la mitad siente su trabajo caótico', 'Microsoft, 2025', 'https://www.microsoft.com/en-us/worklab/work-trend-index/breaking-down-infinite-workday'],
  ['Fatiga', 'supervisar mucha IA a la vez sube el esfuerzo mental y la sobrecarga, y el rendimiento deja de subir', 'Harvard Business Review, 2026', 'https://hbr.org/2026/03/when-using-ai-leads-to-brain-fry'],
  ['52 %', 'de los proyectos sufre cambios de alcance no controlados: el camino cambia', 'PMI, 2018', 'https://www.pmi.org/-/media/pmi/documents/public/pdf/learning/thought-leadership/pulse/pulse-of-the-profession-2018.pdf'],
  ['18–44 %', 'de los problemas dieron código distinto en cinco corridas idénticas, aun con temperatura 0', 'Ouyang y otros, 2025', 'https://arxiv.org/abs/2308.02828'],
];
function paradaProblema() {
  return `<figure class="grafico-stl hoy-stl">
      <b class="grafico-t">Hoy: tú y el modelo, directo</b>
      <div class="cadena-stl dos">
        ${nodo(ACTOR.tu(), 'Tú')}
        <div class="tramo-stl">${flecha('cada mensaje, al instante', 'ida')}${flecha('lo que hizo, tal cual', 'vuelta')}</div>
        ${nodo(ACTOR.modelo(), 'El modelo')}
      </div>
      <ul class="golpes-stl">${GOLPES.map(([t, x, ic]) => `<li>${ficha(COLOR.alerta, ic)}<b>${t}</b><span>${x}</span></li>`).join('')}</ul>
    </figure>
    <h3>No es un caso aislado</h3>
    <ul class="cifras-stl">${CIFRAS.map(([n, x, f, u]) => `<li><b>${n}</b><span>${x}</span><small>${enlace(f, u)}</small></li>`).join('')}</ul>
    ${resultado('El límite ya no es cuánto produce el modelo: es cuánta atención le queda a quien lo dirige.', 'Con IA, cada idea se vuelve código en minutos, y el modelo te sigue sin cuestionar: el proyecto se bifurca más rápido que nunca.')}
    <p class="como">El problema no es la IA, sino la forma de usarla: el estudio más grande no encontró relación entre adoptarla y el agotamiento (${enlace('DORA, 2025', 'https://cloud.google.com/blog/products/ai-machine-learning/announcing-the-2025-dora-report')}).</p>`;
}

// ── Parada 2: cómo funciona. La idea en un gráfico y, una sola vez al empezar, el arranque
const ARRANQUE: [string, string, Icono, string][] = [
  ['Entregas tu proyecto', 'su carpeta, o qué es y qué quieres lograr', 'proyecto', COLOR.tu],
  ['El director lo diagnostica', 'qué está listo, qué falta, qué riesgos ve', 'diagnostico', COLOR.director],
  ['Fijas tu meta', 'y cómo se sabe que llegaste', 'hoy', COLOR.tu],
  ['El director traza la ruta', 'fases con puertas y tu primera misión', 'ruta', COLOR.director],
];
function paradaFunciona() {
  return `${graficoSTL()}
    <h3>Al empezar, una sola vez</h3>
    ${tira(ARRANQUE)}`;
}

// ── Parada 3: lo nuevo. Tú te quedas en el paso que sigue, y lo que se te ocurre entra sin sacarte del cauce
const CAUCE: [string, string, Icono, string][] = [
  ['Se te ocurre algo', 'una idea, un cambio, un ajuste, un pedido', 'escribir', COLOR.ok],
  ['Lo dejas en el Studio', 'en un momento, escrito o en voz; ahí espera', 'buzon', COLOR.studio],
  ['Sigues en tu paso', 'ni lo haces ya, ni se pierde', 'hoy', COLOR.tu],
  ['El director lo pone en su lugar', 'en la revisión, contra la meta', 'ruta', COLOR.director],
];
// El guardrail de la lectura: lo que el director te devuelve se asimila de a una idea, y lo que pide decidir no se salta
const ASIMILAR: [string, string, Icono, string][] = [
  ['Lees de a una idea', 'cada párrafo o punto, corto, se marca «Entendido»', 'documentos', COLOR.tu],
  ['Cada decisión se responde', 'sin tu respuesta, la parte no se da por leída', 'escribir', COLOR.director],
  ['La parte siguiente espera', 'se abre al terminar la de ahora', 'candado', COLOR.studio],
  ['Nada queda a medias', 'el paso de tu misión se marca solo al terminar', 'escudo', COLOR.ok],
];
function paradaNovedad() {
  return `<p class="entrada-parada">Mientras trabajas se te ocurren ideas, cambios, ajustes y pedidos. Hoy, cada uno te saca del paso en que ibas: lo haces ya, o lo pierdes. Ninguna metodología de hoy resuelve eso, porque ordenan el trabajo o al modelo, no lo que tú le pides, prompt a prompt. <b>La novedad de STL: sigues alimentando el proyecto con todo lo que se te ocurra, y te quedas solo en el paso que sigue.</b></p>
    ${tira(CAUCE)}
    <figure class="grafico-stl">
      <b class="grafico-t">Dos actores nuevos entre tú y el modelo</b>
      <div class="cadena-stl">
        ${nodo(ACTOR.tu(), 'Tú', 'la idea y la última palabra')}
        <div class="tramo-stl">${flecha('lo que se te ocurre', 'ida')}${flecha('una respuesta por nota y una sola misión', 'vuelta')}</div>
        ${nodo(ACTOR.studio(), 'El Studio', 'detiene: relees, corriges o borras')}
        <div class="tramo-stl">${flecha('«Revisa»: todo junto', 'ida')}${flecha('en orden, por partes', 'vuelta')}</div>
        ${nodo(ACTOR.director(), 'El director', 'ordena contra la meta')}
        <div class="tramo-stl">${flecha('solo lo aprobado', 'ida')}${flecha('el resultado', 'vuelta')}</div>
        ${nodo(ACTOR.modelo(), 'El modelo', 'tu agente: Claude Code, Codex…')}
      </div>
    </figure>
    ${resultado('STL no orquesta solo al modelo: orquesta tu uso del modelo.', 'Nada le llega sin pasar por el buzón y el director, y nada te vuelve sin orden.')}
    <h3>Y lo que vuelve, se lee y se decide entero</h3>
    <p>En un chat con un agente puedes ignorar lo que te pregunta, o leer por encima, y seguir con otra cosa: el modelo adivina lo que querías y el proyecto se dispersa. En STL, no.</p>
    ${tira(ASIMILAR)}
    ${resultado('Si el director necesita saber algo, lo pide como decisión, y la respondes antes de seguir.', 'Así dirige con lo que de verdad quieres, y no abres otro frente con algo a medias.')}
    <p class="como">Agrupar ayuda: recibir las notificaciones en tres lotes al día dio menos estrés y más sensación de control que recibirlas al instante (${enlace('Fitz y otros, 2019', 'https://doi.org/10.1016/j.chb.2019.07.016')}). Es la idea del buzón. El director y el modelo son dos papeles y pueden ser la misma sesión de tu agente.</p>`;
}

// ── Parada 4: los ocho principios, cada uno en el momento del flujo donde actúa. [número, principio, qué hace]
const PRINCIPIOS: Record<number, [string, string]> = {
  1: ['Un solo director, una sola memoria', 'el estado vive en archivos, no en un chat'],
  2: ['Piensa, corrige y luego envía', 'lo que borras nunca llega al modelo'],
  3: ['Se comenta el párrafo exacto', 'el comentario sabe de qué parte habla'],
  4: ['Siempre hacia adelante', 'lo revisado se sella; lo que cambia llega en un documento nuevo'],
  5: ['Una ruta con puertas', 'cada fase se cruza con sus criterios al 100 %'],
  6: ['Una misión a la vez', 'un solo paso, con su botón al lugar exacto'],
  7: ['El director propone, tú decides', 'con razones y riesgos; la última palabra es tuya'],
  8: ['Avanzar se siente bien', 'niveles y un boletín que califica el foco'],
};
const MOMENTOS: { n: string; c: string; ic: Icono; p: number[] }[] = [
  { n: 'Anotas', c: COLOR.ok, ic: 'escribir', p: [3] },
  { n: 'El buzón', c: COLOR.studio, ic: 'buzon', p: [2] },
  { n: 'La revisión', c: COLOR.director, ic: 'revisar', p: [1, 7] },
  { n: 'La ruta', c: COLOR.ruta, ic: 'ruta', p: [5] },
  { n: 'Tu misión', c: COLOR.tu, ic: 'hoy', p: [6, 8] },
  { n: 'La historia', c: COLOR.modelo, ic: 'candado', p: [4] },
];
function paradaPrincipios() {
  return `<figure class="grafico-stl">
      <ol class="momentos-stl">${MOMENTOS.map((m) => `<li style="--c: ${m.c}">${ficha(m.c, m.ic)}<b class="momento-n">${m.n}</b>
        ${m.p.map((k) => `<div class="principio-chip"><span class="num-principio">${k}</span><b>${PRINCIPIOS[k][0]}</b><span>${PRINCIPIOS[k][1]}</span></div>`).join('')}</li>`).join('')}</ol>
      <p class="vuelta-stl"><span aria-hidden="true">↺</span> Y vuelves a anotar: cada vuelta deja el proyecto un paso más cerca de la meta.</p>
    </figure>
    <p class="como">Son lo que no cambia, uses el Studio o no. Si alguno se rompe, el proyecto vuelve a dispersarse.</p>`;
}

// ── Parada 5: cuándo no aplica. Solo los casos en que falta una de sus bases: [qué falta, por qué, ícono]
const NO_APLICA: [string, string, Icono][] = [
  ['No hay proyecto', 'Una tarea suelta, de una sola vez: un script, una consulta. No hay línea que cuidar ni meta contra la cual ordenar, y entregar el proyecto cuesta más que la tarea.', 'proyecto'],
  ['No hay quien decida', 'STL se apoya en una persona que fija la meta, cruza las puertas y tiene la última palabra. En un flujo sin nadie que decida (un agente o una automatización que corre sola), el director no tiene a quién proponerle.', 'validaciones'],
  ['No hay dónde guardar la memoria', 'La memoria de cada proyecto vive en su propio repositorio git y la ejecuta tu agente de código. Si el proyecto no puede estar en un repositorio, o sus reglas no permiten pasarle su contenido a un modelo de IA, no hay sobre qué montar el método.', 'disco'],
];
function paradaCuandoNo() {
  return `<p class="entrada-parada">STL sirve para cualquier proyecto que dure más de una sesión. Solo no aplica cuando falta una de sus tres bases:</p>
    <ul class="no-aplica-stl">${NO_APLICA.map(([t, x, ic]) => `<li>${ficha(COLOR.tenue, ic)}<div><b>${t}</b><p>${x}</p></div></li>`).join('')}</ul>
    ${resultado('La regla: si hay un proyecto, alguien que decide y un repositorio, STL aplica.', '')}`;
}

// ── Parada 6: empieza. Lo que necesitas, de cero a tu primera misión, la revisión y cómo se usa el Studio
const DE_CERO: [string, string, Icono, string][] = [
  ['Baja STL Studio', 'y abre su carpeta con tu agente', 'proyecto', COLOR.tu],
  ['«Inicializa STL Studio»', 'tu agente instala lo que falta, con tu permiso', 'ajustes', COLOR.director],
  ['Se abre solo', 'en localhost:5180, y queda encendido', 'pagina', COLOR.studio],
  ['Entregas tu proyecto', 'y recibes su diagnóstico', 'diagnostico', COLOR.ok],
];
const REVISION: [string, string, Icono, string][] = [
  ['Pides la revisión', 'con un botón', 'revisar', COLOR.tu],
  ['El Studio llama al director', 'hasta entonces no corre ningún modelo', 'reloj', COLOR.studio],
  ['El director revisa', 'todo junto, con el contexto limpio', 'metodo', COLOR.director],
  ['Lo lees en el Studio', 'una respuesta por nota y tu misión', 'documentos', COLOR.ok],
];
const GLOSARIO: [string, string][] = [
  ['Titular', 'quien dirige el proyecto y decide.'],
  ['Studio', 'la interfaz entre tú y la IA: detiene lo que dices hasta que lo das por bueno y te muestra lo que vuelve, en orden.'],
  ['Director asistente', 'la IA que dirige con el plan y la meta, a través del Studio: orquesta al modelo y te orquesta a ti, con una sola misión a la vez.'],
  ['Modelo', 'tu agente de IA (Claude Code, Codex…): ejecuta lo que el director le envía.'],
  ['Objetivo firmado', 'qué se logra y cómo se sabe que se logró.'],
  ['Fase y puerta', 'un tramo de la ruta y el paso al siguiente, con sus criterios al 100 %.'],
  ['Frente', 'un área de trabajo del proyecto; en cada fase está en foco, de apoyo o en espera.'],
  ['Misión', 'un paso concreto con su porqué y su entrega. Una a la vez.'],
  ['Buzón', 'donde esperan tus comentarios hasta la revisión.'],
  ['Revisión', 'el momento en que el director recibe lo que quedó en firme y responde todo junto.'],
  ['Sello', 'la marca de lo ya revisado, que no vuelve.'],
  ['Validación', 'gente de afuera usando lo hecho, o una prueba técnica, como evidencia.'],
];
function paradaEmpieza(ir: (vista: string, texto: string) => string, o: { conPestanas?: boolean }) {
  const uso: [Icono, string, string][] = [
    ['proyectos', 'Un proyecto activo a la vez', `Arriba de la barra lateral cambias de proyecto o entregas uno nuevo; al volver, el director te dice dónde quedaron.${ir('proyectos', 'Ver los proyectos')}`],
    ['hoy', 'Hoy, primero', `Lo que dijo el director y tu misión de ahora. Cada paso trae su botón al lugar exacto, y la cara del director te lleva a lo que sigue.${ir('misiones', 'Ir a Hoy')}`],
    ['buzon', 'Opina donde estés', `Cada «Comentar al director» deja lo que digas, escrito o en voz, en el Buzón, donde lo corriges o lo borras.${ir('buzon', 'Abrir el Buzón')}`],
    ['documentos', 'Un documento a la vez', 'Se abre el que sigue en tu orden de lectura, parte por parte y de a una idea (solo la de ahora a la vista; con «Modo enfoque», nada más alrededor): marca cada una «Entendido» y responde cada decisión.'],
    ['estrella', 'Entrega', 'Marca cada paso con «Listo, ya lo hice»: con el último, la misión se entrega sola. Lo entregado queda sellado.'],
    ['pregunta', 'Pregunta sin cortar tu trabajo', `Las anotas cuando se te ocurren; el director las responde juntas, como un informe.${ir('preguntas', 'Ver las preguntas')}`],
  ];
  return `<h3>De cero a tu primera misión</h3>
    ${tira(DE_CERO)}
    <div class="agentes-stl">
      <article class="agente-stl">
        <h3>${ACTOR.modelo()} Con Claude Code</h3>
        <ul>
          <li><b>Plan:</b> Pro, Max, Team o Enterprise (el gratuito no incluye Claude Code).</li>
          <li><b>Sesión:</b> <code>claude</code> en la carpeta del Studio, con tu cuenta. Si tienes <code>ANTHROPIC_API_KEY</code> en el entorno, se cobra como API: quítala y revisa con <code>/status</code>.</li>
          <li><b>Revisión al instante:</b> inicia sesión una vez en su CLI (<code>claude auth login</code>) y el botón «Pedir revisión» basta.</li>
        </ul>
        <p class="como">${enlace('Claude Code con tu plan ↗', 'https://support.claude.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan')}</p>
      </article>
      <article class="agente-stl">
        <h3>${ACTOR.modelo()} Con Codex</h3>
        <ul>
          <li><b>Plan:</b> ChatGPT Plus, Pro, Business, Enterprise o Edu.</li>
          <li><b>Sesión:</b> <code>codex login</code> con tu cuenta de ChatGPT; lee el <code>AGENTS.md</code> del Studio.</li>
          <li><b>Revisión:</b> escríbele «revisa estudio», o prográmala como tarea en la app de Codex.</li>
        </ul>
        <p class="como">${enlace('Iniciar sesión en Codex ↗', 'https://learn.chatgpt.com/docs/auth')}</p>
      </article>
    </div>
    <p class="como">Con tu suscripción de programador, no por API: el Studio no llama a ninguna API ni toca tus credenciales. Por API, Claude Code cuesta en promedio unos 13 USD por desarrollador y día activo (${enlace('Anthropic', 'https://code.claude.com/docs/en/costs')}); la suscripción, desde 20 USD al mes.</p>
    <h3>La revisión: al instante, y sin gastar mientras no haya nada</h3>
    ${tira(REVISION)}
    <p class="como">El director que llama el Studio solo escribe lo que aprobaste o pediste, con pruebas y commits locales; nunca sube, despliega ni borra. Mientras revisa, te mueves y lees; lo nuevo espera a que termine.</p>
    <h3>Cómo se usa el Studio</h3>
    <ul class="uso-stl">${uso.map(([ic, t, x]) => `<li>${ficha(COLOR.studio, ic)}<div><b>${t}</b><p>${x}</p></div></li>`).join('')}</ul>
    <details class="plegable-stl"><summary>Glosario</summary>
      <dl class="glosario-stl">${GLOSARIO.map(([t, x]) => `<div><dt>${t}</dt><dd>${x}</dd></div>`).join('')}</dl>
    </details>
    <p class="como">${icono('documentos')} La versión larga, para leerla de corrido, es «La metodología» (docs/metodo/metodologia.md)${o.conPestanas ? ', en su pestaña, arriba de esta página' : ''}.</p>`;
}

// Las paradas del recorrido, en orden: [id, nombre en la barra, ícono, título de la parada]
const PARADAS: [string, string, Icono, string][] = [
  ['problema', 'El problema', 'urgente', 'Con IA, todo se ejecuta al instante, también lo que no debía'],
  ['funciona', 'Cómo funciona', 'stl', 'Cada idea, en su lugar de la línea'],
  ['novedad', 'Lo nuevo', 'escudo', 'Tú, solo en el paso que sigue; lo demás, en su lugar'],
  ['principios', 'Los principios', 'estrella', 'Los ocho principios, en el flujo'],
  ['cuando-no', 'Cuándo no aplica', 'cerrar', 'Cuándo no aplica'],
  ['empieza', 'Empieza', 'check', 'Empieza'],
];

/**
 * El recorrido sin JavaScript: un radio por parada y, con :has(), solo se ve la marcada. Sin :has() (o sin CSS), se ven
 * todas, de corrido, y la página se lee igual. Las reglas salen de PARADAS, para que no se desalineen.
 */
function estiloRecorrido() {
  const reglas = PARADAS.map(([id]) => `.recorrido-stl:has(#parada-${id}:checked) .parada-stl:not([data-parada="${id}"]) { display: none; }
    .recorrido-stl:has(#parada-${id}:checked) .paradas-stl label[for="parada-${id}"] { background: var(--acento-fondo); border-color: var(--acento); color: var(--acento-texto); }
    .recorrido-stl:has(#parada-${id}:focus-visible) .paradas-stl label[for="parada-${id}"] { outline: 2px solid var(--acento); outline-offset: 2px; }`).join('\n');
  return `<style>@supports selector(:has(a)) {\n${reglas}\n.recorrido-stl .pie-parada { display: flex; }\n}</style>`;
}

/**
 * Al cambiar de parada, la página vuelve a la barra del recorrido si quedó arriba, fuera de la vista, y el Studio
 * recuerda la parada (se repinta seguido). Es autocontenida a propósito: la página pública la incrusta tal cual
 * (tools/publicar-stl.ts), sin módulos.
 */
export function activarRecorrido() {
  document.addEventListener('change', (e) => {
    const r = e.target as HTMLInputElement | null;
    if (!r || !r.classList || !r.classList.contains('parada-radio')) return;
    try { sessionStorage.setItem('stl.parada', r.id); } catch { /* sin almacenamiento, el recorrido sigue igual */ }
    const barra = document.querySelector('.paradas-stl');
    if (barra && barra.getBoundingClientRect().top < 0) barra.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

/** Al repintar la página en el Studio, vuelve a la parada en que iba quien la lee */
export function restaurarParada(raiz: ParentNode) {
  let id: string | null = null;
  try { id = sessionStorage.getItem('stl.parada'); } catch { /* sin almacenamiento, empieza en la primera */ }
  const r = id ? raiz.querySelector<HTMLInputElement>(`input.parada-radio#${CSS.escape(id)}`) : null;
  if (r) r.checked = true;
}

/** `conPestanas`: en el Studio, la página va con las pestañas de la documentación del Studio arriba. */
export function paginaSTL(o: { conProyectos: boolean; conPestanas?: boolean }): string {
  const ir = (vista: string, texto: string) => (o.conProyectos ? ` <button type="button" class="ir-paso" data-vista="${vista}">${texto} →</button>` : '');
  const contenido: Record<string, () => string> = {
    problema: paradaProblema, funciona: paradaFunciona, novedad: paradaNovedad, principios: paradaPrincipios,
    'cuando-no': paradaCuandoNo, empieza: () => paradaEmpieza(ir, o),
  };
  const radios = PARADAS.map(([id, n], i) => `<input type="radio" class="parada-radio" name="parada-stl" id="parada-${id}" aria-label="${n}"${i ? '' : ' checked'}>`).join('');
  const barra = `<nav class="paradas-stl" aria-label="El recorrido">${PARADAS.map(([id, n, ic], i) => `<label for="parada-${id}"><span class="num-parada">${i + 1}</span>${icono(ic)}<span>${n}</span></label>`).join('')}</nav>`;
  const paradas = PARADAS.map(([id, , , titulo], i) => {
    const antes = PARADAS[i - 1], despues = PARADAS[i + 1];
    return `<section class="seccion-stl parada-stl" data-parada="${id}">
      <h2><span class="num-parada">${i + 1}</span>${titulo}</h2>
      ${contenido[id]()}
      <div class="pie-parada">${antes ? `<label for="parada-${antes[0]}" class="parada-antes">← ${antes[1]}</label>` : '<span></span>'}${despues ? `<label for="parada-${despues[0]}" class="parada-sigue">Sigue: ${despues[1]} →</label>` : ''}</div>
    </section>`;
  }).join('');
  return `<article class="pagina-stl recorrido-stl">
    ${estiloRecorrido()}
    <header class="portada-stl">
      <span class="sobretitulo">La metodología STL · Sacred Time Line</span>
      <h1>Una sola línea de tiempo para tu proyecto</h1>
      <p class="entrada">Una metodología para <b>usar mejor los modelos de IA</b>, en cualquier proyecto. Entre tú y tu agente pone <b>dos actores nuevos</b>, el Studio y el director, y te deja ver <b>solo lo que sigue</b>.</p>
      <p>Cada idea abre una rama; el director la pone en su lugar de la línea, y la línea nunca vuelve atrás. Tú sigues sumando ideas, cambios y pedidos, y <b>te quedas en el paso que sigue</b>, sin salirte del cauce.</p>
      <p class="cta-demo"><a class="boton-demo" href="${o.conProyectos ? '/?demo' : 'demo/'}" target="_blank" rel="noopener noreferrer">▶ Pruébalo sin instalar nada: el Studio de demostración</a></p>
      <p class="como">Metodología creada por ARGWABOT (A Regular Guy With A Bunch Of Tokens). El STL Studio es su aplicación base, gratuita para desarrolladores.</p>
    </header>
    ${radios}
    ${barra}
    ${paradas}
  </article>`;
}
