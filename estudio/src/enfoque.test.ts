import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { icono } from './iconos';

const leer = (ruta: string) => readFileSync(join(__dirname, ruta), 'utf-8');
const css = leer('director.css');
const zen = leer('zen.ts');
const director = leer('director.ts');
const atajos = leer('../../index.html').match(/<div class="atajos-director"[\s\S]*?<\/div>/)?.[0] ?? '';

describe('el modo enfoque (notas del titular, 22 de octubre de 2026)', () => {
  it('junto a la cara del director ya no se pide la revisión: ese atajo pone y quita el enfoque, con el icono del botón de arriba', () => {
    expect(atajos).not.toContain('data-revision');
    const atajo = atajos.match(/<button[^>]*data-enfoque[^>]*>[\s\S]*?<\/button>/)?.[0] ?? '';
    expect(atajo).toContain('aria-pressed="false"');
    // Solo donde el enfoque aplica: director.ts lo muestra
    expect(atajo).toMatch(/ hidden>/);
    const trazos = icono('enfoque').match(/aria-hidden="true">([\s\S]*)<\/svg>/)?.[1] ?? '?';
    expect(atajo).toContain(trazos);
  });

  it('nada sigue al puntero ni se mueve solo: queda el desenfoque, que entra y sale suave en 0,5 a 0,7 s', () => {
    expect(zen).not.toMatch(/pointermove|requestAnimationFrame|addEventListener/);
    expect(css).not.toMatch(/zen-luz|zen-niebla|@keyframes zen-/);
    const velo = css.match(/\.velo-zen \{[^}]*\}/)?.[0] ?? '';
    expect(velo).toContain('backdrop-filter');
    const segundos = Number(velo.match(/transition: opacity ([\d.]+)s/)?.[1]);
    expect(segundos).toBeGreaterThanOrEqual(0.5);
    expect(segundos).toBeLessThanOrEqual(0.7);
    // Lo enfocado sigue encima del velo justo lo que este tarda en irse
    expect(Number(director.match(/const MS_VELO = (\d+);/)?.[1])).toBe(Math.round(segundos * 1000));
    // Con «menos movimiento» en el sistema, sin transición
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{[^@]*\.velo-zen \{ transition: none; \}/);
  });

  it('sin franja arriba: el velo cubre toda la pantalla, también la cabecera, que ya no sube por encima de él', () => {
    const velo = css.match(/\.velo-zen \{[^}]*\}/)?.[0] ?? '';
    expect(velo).toContain('position: fixed; inset: 0; z-index: 35;');
    expect(css).not.toContain('.cabeza-proyecto::after');
    // Solo al salir, mientras el velo se va, la cabecera queda encima de lo que vuelve a su lugar
    expect(css).not.toMatch(/html:is\(\.enfoque, \.enfoque-mision[^)]*\) \.cabeza-proyecto \{[^}]*z-index/);
    expect(css).toMatch(/html\.enfoque-saliendo \.cabeza-proyecto \{ z-index: 41; \}/);
  });

  it('lo enfocado, documento o misión, es una ventana al centro, ancha, que se desplaza por dentro y no empieza bajo la cabecera', () => {
    const ventana = css.match(/html\.enfoque \.docs > \.lector, html\.enfoque-mision \.mision-c\.sigue\.mia \{[^}]*\}/)?.[0] ?? '';
    expect(ventana).toContain('position: fixed');
    expect(ventana).toContain('margin: auto');
    expect(ventana).toContain('width: min(1200px, calc(92 * var(--vw)))');
    expect(ventana).toContain('height: fit-content');
    expect(ventana).toContain('overflow-y: auto');
    expect(ventana).toContain('var(--enfoque-arriba, 24px)');
    expect(ventana).not.toContain('--alto-cabeza');
    // La página no se desplaza detrás, tampoco en la misión
    expect(css).toContain('html:is(.enfoque, .enfoque-mision), html:is(.enfoque, .enfoque-mision) body { overflow: hidden; }');
    // En el teléfono, a la izquierda, con el margen de los atajos (por ahí se sale)
    expect(css).toMatch(/@media \(max-width: 759px\) \{\s*html\.enfoque \.docs > \.lector, html\.enfoque-mision \.mision-c\.sigue\.mia \{ inset: 8px; width: calc\(100 \* var\(--vw\) - 84px\)/);
  });

  it('la salida flota encima del velo y de lo enfocado, en el lugar del botón de la cabecera, solo con el enfoque puesto', () => {
    expect(zen).toContain("className = 'boton-suave boton-enfoque salida-enfoque'");
    expect(zen).toContain('dataset.enfoque');
    expect(zen).toContain('hidden = true');
    const salida = css.match(/\.salida-enfoque \{[^}]*\}/)?.[0] ?? '';
    expect(salida).toContain('position: fixed');
    expect(Number(salida.match(/z-index: (\d+)/)?.[1])).toBeGreaterThan(40);
    expect(css).toContain('html:is(.enfoque, .enfoque-mision) .cabeza-proyecto .boton-enfoque { visibility: hidden; }');
    expect(director).toContain("b.hidden = b.classList.contains('salida-enfoque') ? !si : !aqui;");
    // ubicarEnfoque la lleva al botón de la cabecera y baja lo enfocado solo si quedaría debajo de ella
    const ubicar = director.match(/function ubicarEnfoque\(\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(ubicar).toContain("$('mando').querySelector<HTMLElement>('.boton-enfoque')");
    expect(ubicar).toContain('--enfoque-arriba');
  });

  it('al terminar un documento en el enfoque no queda una ventana vacía: se sale y se vuelve a la misión (captura del titular, 22 de octubre de 2026)', () => {
    // Sin nada por leer, el enfoque se apaga siempre, y ponerlo lo dice en vez de abrir la ventana
    const aplicar = director.match(/function aplicarEnfoque\(\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(aplicar).toContain("if (enfoque === 'documento' && nadaPorLeer()) enfoque = '';");
    const poner = director.match(/function ponerEnfoque\(si: boolean\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(poner).toContain('nadaPorLeer()');
    // La última parte leída en el enfoque lleva a la tarjeta de la misión, sin el diálogo de por medio
    const marcar = director.match(/async function marcarParte\(titulo: string\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(marcar).toContain("const enEnfoque = enfoque === 'documento';");
    expect(marcar.indexOf('return volverAMision();')).toBeGreaterThan(0);
    expect(marcar.indexOf('return volverAMision();')).toBeLessThan(marcar.indexOf('await documentoTerminado('));
    const volver = director.match(/function volverAMision\(\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(volver).toContain('ponerEnfoque(false)');
    expect(volver).toContain('void ir(sigue)');
    expect(volver).toContain("irA('misiones')");
  });

  it('el ✉ de cada punto de un bloque se ve siempre, y el documento abierto desde un paso ofrece volver a la misión (22 de octubre de 2026)', () => {
    const sobre = css.match(/\.cuerpo-trozo li > \.comentar-punto \{[^}]*\}/)?.[0] ?? '';
    expect(sobre).toContain('opacity: 1');
    expect(sobre).not.toMatch(/opacity: 0\./);
    // El botón de un paso dentro de una misión, y «Continuar misión», recuerdan de qué misión se vino
    expect(director).toMatch(/b\.closest<HTMLElement>\('\.mision-c'\)\?\.dataset\.ancla/);
    expect(director).toContain('desdeMision = { id, ruta: paso.ir.doc };');
    // «← Volver a tu misión» flota abajo al centro, fuera de la ventana del documento y encima del velo (pd_volver_flotante)
    expect(director).toContain('</article>${volverAMisionDe(ruta)}</div>');
    expect(director).toContain('← Volver a tu misión');
    expect(director).toContain('} else if (ds.volverMision) {');
    const flotante = css.match(/\.volver-flotante \{[^}]*\}/)?.[0] ?? '';
    expect(flotante).toContain('position: fixed');
    expect(Number(flotante.match(/z-index: (\d+)/)?.[1])).toBeGreaterThan(40);
  });

  it('el paso que lleva a otra sección (una fase en «La ruta», Proyecto) también ofrece volver a la misión (nota de voz del titular nmvok784vtit)', () => {
    // El botón del paso recuerda la sección a la que lleva, salvo una página de afuera o el ✉, que no cambian de lugar
    expect(director).toContain("else if (deMision && dest && !dest.url && !(dest.vista === 'buzon' && dest.ancla === 'escribir')) {");
    expect(director).toContain("if (a && a !== 'misiones') desdeMision = { id: deMision, vista: a };");
    // Con los cambios de lugar de ir(): el director en este computador vive en «Modelo y consumo», el diagnóstico en Proyecto
    expect(director).toContain("dest.vista === 'proyecto' && dest.ancla === 'p-director' ? 'modelo' : dest.vista === 'diagnostico' ? 'proyecto' : dest.vista;");
    // pintar() lo hace flotar en esa sección; en un documento lo pone el lector, como antes
    expect(director).toContain("v.innerHTML = errores + html + (vista !== 'documentos' && desdeMision?.vista === vista ? botonVolverMision(desdeMision.id) : '');");
    // De vuelta en las misiones, termina
    expect(director).toContain("if (nueva === 'misiones' && desdeMision?.vista) desdeMision = null;");
  });

  it('el enfoque se mantiene al navegar donde aplica, y quitarlo lo quita en todas partes (nota de voz del titular nmvog4cd2tit)', () => {
    // Solo lo que hace la persona cambia lo que quiere: sus botones, su atajo, Esc y «Continuar en modo enfoque»
    expect(director).toContain("if ((e.target as HTMLElement).closest('[data-enfoque]')) quererEnfoque(!enfoque);");
    expect(director).toContain("if (e.key === 'Escape' && enfoque && !document.querySelector('dialog[open]')) quererEnfoque(false);");
    expect(director).toContain("if (modo === 'enfoque' && vista === 'documentos' && doc?.ruta === paso.ir.doc) quererEnfoque(true);");
    // Al cambiar de lugar, sigue enfocado donde aplica; un documento abierto en una parte ya leída, no
    const aplicar = director.match(/function aplicarEnfoque\(\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(aplicar).toContain("if (enfoque !== aqui) enfoque = enfoqueQuerido && (aqui !== 'documento' || enfoqueAlAbrir) ? aqui : '';");
    expect(aplicar).toContain("if (enfoque === 'documento' && antes !== 'documento') requestAnimationFrame(() => centrarIdea());");
    expect(director).toContain('enfoqueAlAbrir = !seccion || !leidasDe(ruta).includes(seccion);');
    // La cara ya no pregunta si salir del enfoque: lleva, y el enfoque sigue donde aplica
    const cara = director.match(/async function irDesdeLaCara\(dest: Destino\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(cara).not.toContain('¿Salir del modo enfoque?');
    expect(cara).not.toContain('ponerEnfoque(false)');
  });

  it('un paso ya visto que se responde en la tarjeta no vuelve a mandar al documento (nota de voz del titular nmvofxfv0tit)', () => {
    // «Continuar misión» y «Continuar en modo enfoque» solo mientras no se abrió, o si es leer (el Studio lo marca solo)
    expect(director).toContain("paso.ir?.doc && (paso.hecho || !pasoAbierto(m.id, sigue))) {");
    // Y continuar cuenta como abrir el paso, como su botón
    expect(director).toContain('localStorage.setItem(claveAbierto(id, Number(i)), \'1\');');
    // La cara mira lo mismo
    expect(leer('equipo.ts')).toContain('pasosAbiertos(datos?.activo ?? \'\', m.id, m.pasos.length)');
  });

  it('los controles de la franja, en cuatro grupos separados por una línea fina: el tema, la niebla, la narración y el sonido (pd_controles_enfoque)', () => {
    // Las dos franjas, la del documento y la de la misión, arman los grupos con el mismo ayudante, y en el mismo orden
    expect(director).toContain("import { controlesEnfoque } from './controlesEnfoque';");
    const franja = director.match(/function ajustesLector\(ruta: string\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    const mision = director.match(/function opcionesMision\(\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    const orden = (texto: string) => ['tema:', 'niebla: controlAuto(\'niebla\')', 'narracion: controlAuto(\'voz\')', 'sonido: botonSonido()'].map((x) => texto.indexOf(x));
    for (const texto of [franja, mision]) {
      const lugares = orden(texto);
      expect(lugares.every((n) => n > -1)).toBe(true);
      expect([...lugares].sort((a, b) => a - b)).toEqual(lugares);
    }
    // La letra, que ya estaba en la franja del documento, queda con el tema; la misión no la tiene
    expect(franja).toMatch(/tema: `\$\{botonTema\(\)\}<span class="tamanos-letra">/);
    expect(mision).toContain('tema: botonTema()');
    // Ningún control se perdió: la nube, ▶ con su velocidad, el altavoz que lee y el tema siguen siendo los mismos botones
    expect(leer('guiaLectura.ts')).toContain("export function controlAuto(parte: 'todo' | 'niebla' | 'voz' = 'todo'): string {");
    // La línea fina: el comienzo de cada grupo menos el primero, que no se dibuja si el grupo no se ve (la narración sin niebla)
    expect(css).toMatch(/\.grupo-enfoque \+ \.grupo-enfoque::before \{[^}]*width: 1px;[^}]*background: var\(--borde\);/);
    expect(css).toContain('html:not(.enfoque) .opciones-lector .grupo-enfoque:not(.grupo-enfoque-tema), html:not(.niebla-lectura) .grupo-enfoque-narracion { display: none; }');
  });

  it('«¿Dónde quedamos?» presenta los mismos controles, en los mismos cuatro grupos y el mismo orden (nota de voz del titular nmvpi5ydttit)', () => {
    const dq = director.match(/function opcionesDq\(\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    const orden = ['tema: botonTema()', "niebla: controlAuto('niebla')", "narracion: controlAuto('voz')", 'sonido: botonSonido()'].map((x) => dq.indexOf(x));
    expect(orden.every((n) => n > -1)).toBe(true);
    expect([...orden].sort((a, b) => a - b)).toEqual(orden);
    expect(dq).toContain('controlesEnfoque({');
    // En la cabecera del diálogo, y ya no los controles sueltos de antes
    expect(director).toContain('· dónde quedamos</h2>${opcionesDq()}</div>');
    expect(director).not.toContain('${controlAuto()}');
    // Mismo aspecto que en las otras franjas: el botón del tema y el de sonido, cuadrados de 34 px
    expect(css).toContain('.opciones-dq .boton-tema { min-height: 34px; width: 34px;');
    // Un diálogo modal tapa todo lo que está fuera de él: el menú de sonido se monta dentro del diálogo que tiene el botón,
    // y Esc cierra solo el menú, no el diálogo
    const panel = leer('panelSonidos.ts');
    expect(panel).toContain("(b.closest('dialog') ?? document.body).append(panel);");
    expect(panel).toMatch(/if \(e\.key !== 'Escape' \|\| !panel\) return;\n\s*\/\/[^\n]*\n\s*e\.preventDefault\(\);\n\s*e\.stopPropagation\(\);/);
  });

  it('el botón de sonido de la franja abre ahí mismo, sin salir del enfoque, un menú pequeño con los efectos y la música (pd_controles_enfoque)', () => {
    const panel = leer('panelSonidos.ts');
    // El mismo botón de la cabecera (su altavoz, tachado con los efectos apagados, y sus textos en español), no otro
    expect(panel).toContain("${icono(apagados ? 'silencio' : 'altavoz')}");
    expect(panel).toContain('aria-label="${esc(titulo)}"');
    expect(panel).not.toContain('data-enfoque');
    // Desde la franja abre el menú pequeño: efectos y música con sus volúmenes y su pista, sin lo de cada momento ni la voz
    expect(panel).toContain("compacto = !!b.closest('.grupo-enfoque');");
    expect(panel).toContain('return compacto ? contenidoSonidos(false) : contenidoSonidos() + grupoVoz();');
    expect(panel).toContain("${conMomentos ? '<button type=\"button\" class=\"boton-suave ps-momentos\" data-ps-momentos>Los sonidos de cada momento</button>' : ''}");
    for (const ajuste of ['data-ps="efectos"', 'data-ps="volEfectos"', 'data-ps="musica"', 'data-ps="volMusica"', 'data-ps="pista"']) expect(panel).toContain(ajuste);
    // Los mismos ajustes de siempre, no una copia: el menú pequeño es el panel de la cabecera con menos cosas
    expect(panel).toContain("cambiarAjustes(k === 'efectos' ? { efectos: si } : { musica: si });");
    // Esc lo cierra y nada más: en la captura, antes de que el enfoque lo oiga, y el foco vuelve a su botón
    const esc = panel.match(/document\.addEventListener\('keydown', \(e\) => \{[\s\S]*?\}, true\);/)?.[0] ?? '';
    expect(esc).toContain("if (e.key !== 'Escape' || !panel) return;");
    expect(esc).toContain('e.stopPropagation();');
    expect(esc).toContain('cerrarPanel(origen);');
    expect(panel).toContain('if (panel) cerrarPanel(botones().indexOf(b));');
    // Y el enfoque, que se sale con Esc, sigue oyéndolo en la burbuja, solo si el panel no lo tomó antes
    expect(director).toContain("if (e.key === 'Escape' && enfoque && !document.querySelector('dialog[open]')) quererEnfoque(false);");
    // Encima del velo, de la ventana enfocada y de la salida; y con la niebla puesta, un clic en él no se frena
    const elPanel = css.match(/\.panel-sonido \{[^}]*\}/)?.[0] ?? '';
    expect(Number(elPanel.match(/z-index: (\d+)/)?.[1])).toBeGreaterThan(46);
    expect(director).toMatch(/const LIBRE_DE_NIEBLA = '[^']*\[data-sonido\][^']*';/);
    // Ni el sonido ni el tema son del enfoque: su clic no lo pone ni lo quita
    expect(director).toContain("if ((e.target as HTMLElement).closest('[data-enfoque]')) quererEnfoque(!enfoque);");
  });

  it('una nota cuyo audio ya no existe queda solo con su texto, sin reproductor roto (22 de octubre de 2026)', () => {
    const audio = director.match(/function audioYTexto\(audio: string \| undefined\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    // Con su texto, no hay reproductor
    expect(audio).toContain("const reproductor = t ? '' :");
    // Si el <audio> falla al cargar, se quita (el error no sube: se escucha en la captura)
    const quita = director.match(/document\.addEventListener\('error', \(e\) => \{[\s\S]*?\}, true\);/)?.[0] ?? '';
    expect(quita).toContain('a instanceof HTMLAudioElement');
    expect(quita).toContain('a.remove()');
  });
});
