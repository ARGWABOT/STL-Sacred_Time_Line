import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { icono } from './iconos';
import { lugarDeLaSalida, SALIDA_ARRIBA, SALIDA_DERECHA } from './escala';

const leer = (ruta: string) => readFileSync(join(__dirname, ruta), 'utf-8');
const css = leer('director.css');
const zen = leer('zen.ts');
const director = leer('app.ts');
const atajos = leer('../../index.html').match(/<div class="atajos-director"[\s\S]*?<\/div>/)?.[0] ?? '';

describe('el modo enfoque (notas del titular, 22 de octubre de 2026)', () => {
  it('junto a la cara del director ya no se pide la revisión: ese atajo pone y quita el enfoque, con el icono del botón de arriba', () => {
    expect(atajos).not.toContain('data-revision');
    const atajo = atajos.match(/<button[^>]*data-enfoque[^>]*>[\s\S]*?<\/button>/)?.[0] ?? '';
    expect(atajo).toContain('aria-pressed="false"');
    // Solo donde el enfoque aplica: app.ts lo muestra
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

  it('la salida se ve aunque se entre al enfoque con la página bajada (nota de voz nmvv23qhhtit y su captura, 30 de octubre de 2026)', () => {
    // Con el enfoque, body no se desplaza y la cabecera deja de pegarse arriba: con la página bajada 600 px, su botón
    // queda encima de la ventana. Antes la salida iba ahí mismo, con top negativo, y no se veía
    const ventana = { ancho: 1840, alto: 860 };
    const arribaFuera = { left: 1640, right: 1800, top: -574, bottom: -538, width: 160, height: 36 };
    const fuera = lugarDeLaSalida(arribaFuera, ventana.ancho, ventana.alto);
    expect(fuera.top).toBe(SALIDA_ARRIBA);
    expect(fuera.top + arribaFuera.height).toBeLessThanOrEqual(ventana.alto);
    expect(fuera.right).toBe(40);
    expect(fuera.abajo).toBe(SALIDA_ARRIBA + 36);
    // Con la página arriba, en el lugar exacto del botón de la cabecera, como siempre
    const arriba = { left: 1640, right: 1800, top: 26, bottom: 62, width: 160, height: 36 };
    expect(lugarDeLaSalida(arriba, ventana.ancho, ventana.alto)).toEqual({ top: 26, right: 40, abajo: 62 });
    // Debajo de la ventana, o sin medida, también arriba a la derecha
    expect(lugarDeLaSalida({ ...arriba, top: 900, bottom: 936 }, ventana.ancho, ventana.alto).top).toBe(SALIDA_ARRIBA);
    expect(lugarDeLaSalida({ left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 }, ventana.ancho, ventana.alto)).toMatchObject({ top: SALIDA_ARRIBA, right: SALIDA_DERECHA });
    // Lo que dice el CSS es el mismo lugar de respaldo
    expect(css.match(/\.salida-enfoque \{[^}]*\}/)?.[0]).toContain(`top: ${SALIDA_ARRIBA}px; right: ${SALIDA_DERECHA}px;`);
    // ubicarEnfoque la ubica con esa función, y sin medida vuelve al lugar del CSS en vez de quedarse donde la dejó una medida vieja
    const ubicar = director.match(/function ubicarEnfoque\(\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(ubicar).toContain('const lugar = lugarDeLaSalida(r, anchoDeVentana(), altoDeVentana());');
    expect(ubicar).toContain('salida.style.top = `${lugar.top}px`;');
    expect(ubicar).not.toContain('salida.style.top = `${r.top}px`;');
    expect(ubicar).toContain("salida?.style.removeProperty('top');");
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

  it('un documento sin partes, como AGENTS.md, se ve en el enfoque: no queda la ventana vacía (nota de voz nmvvkncc1tit y su captura, 30 de octubre de 2026)', () => {
    // Su única parte, sin título, es la entrada y es lo que se lee: el enfoque esconde la entrada solo cuando no se lee
    const oculto = css.split(/\r?\n/).find((l) => l.startsWith('html.enfoque .lector :is(.parte-doc.cerrada')) ?? '';
    expect(oculto).toContain('{ display: none; }');
    expect(oculto).toContain('.entrada-doc:not(.por-leer)');
    expect(oculto).not.toMatch(/\.entrada-doc[,)]/);
    // Ya leída, cuenta como leída: el enfoque se apaga en vez de mostrar una ventana vacía
    const nada = director.match(/function nadaPorLeer\(\): boolean \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(nada).toContain('secciones(doc.texto).filter((s) => paraLeer.has(s.titulo))');
    expect(nada).not.toContain('s.titulo && paraLeer.has(s.titulo)');
  });

  it('el ✉ de cada punto de un bloque se ve siempre, y el documento abierto desde un paso ofrece volver a la misión (22 de octubre de 2026)', () => {
    const sobre = css.match(/\.cuerpo-trozo li > \.comentar-punto \{[^}]*\}/)?.[0] ?? '';
    expect(sobre).toContain('opacity: 1');
    expect(sobre).not.toMatch(/opacity: 0\./);
    // El botón de un paso dentro de una misión, y «Continuar misión», recuerdan de qué misión se vino
    expect(director).toMatch(/b\.closest<HTMLElement>\('\.mision-c'\)\?\.dataset\.ancla/);
    expect(director).toContain('desdeMision = { id, ruta: paso.ir.doc };');
    // «← Volver a tu misión» flota abajo al centro, fuera de la ventana del documento y encima del velo (pd_volver_flotante)
    expect(leer('vistaDocumentos.ts')).toContain('</article>${volverAMisionDe(ruta)}</div>');
    expect(director).toContain('← Volver a tu misión');
    expect(director).toContain('} else if (ds.volverMision) {');
    const flotante = css.match(/\.volver-flotante \{[^}]*\}/)?.[0] ?? '';
    expect(flotante).toContain('position: fixed');
    expect(Number(flotante.match(/z-index: (\d+)/)?.[1])).toBeGreaterThan(40);
  });

  it('el paso que lleva a otra sección (una fase en «La ruta», Proyecto) también ofrece volver a la misión (nota de voz del titular nmvok784vtit)', () => {
    // El botón del paso recuerda la sección a la que lleva, salvo una página de afuera o el ✉, que no cambian de lugar
    // (volverMision.ts › desdeElPaso; su prueba recorre cada clase de destino)
    expect(director).toContain('desdeMision = desdeElPaso(deMision, dest, vistaDeDestino(dest)) ?? desdeMision;');
    // Con los cambios de lugar de ir(): el director en este computador vive en «Modelo y consumo», el diagnóstico en Proyecto
    expect(director).toContain("dest.vista === 'proyecto' && dest.ancla === 'p-director' ? 'modelo' : dest.vista === 'diagnostico' ? 'proyecto' : dest.vista;");
    // pintar() lo hace flotar en esa sección; en un documento lo pone el lector, como antes
    expect(director).toContain("v.innerHTML = errores + html + (vista !== 'documentos' && flotaVolver(desdeMision, vista, null) ? botonVolverMision(desdeMision?.id) : '');");
    // De vuelta en las misiones, termina
    expect(director).toContain("if (nueva === 'misiones' && desdeMision?.vista) desdeMision = null;");
  });

  it('ninguna misión atrapa: «Volver a tu misión» sobrevive a la recarga, y un paso sin marcar vuelve a mostrar sus opciones (nmvsze1tytit, t_rehacer_voz)', () => {
    // La recarga del final de una revisión borraba de dónde se venía: la pestaña lo guarda y pintar() lo pone al día
    expect(director).toContain("JSON.parse(sessionStorage.getItem(CLAVE_DESDE_MISION) ?? 'null')");
    expect(director).toMatch(/recordarDesdeMision\(\);\s*v\.innerHTML = /);
    // «Elegiste» solo en un paso marcado; sin marcar, sus opciones, con la elección de antes como pista
    expect(director).toContain('const elegida = eleccionALaVista(d.estado.notas, m.id, i, m.para, hecho)?.sobre.eleccion;');
    expect(director).toContain('return pista + opcionesSinElegir(m, i, opciones, esperar, ir, varias);');
    // Lo elegido antes de un «rehacer» no vuelve a marcar el paso solo
    expect(director).toContain("pasosVistos(m, d.proyecto, d.estado, estadoMision(m, d.plan, d.estado) === 'rehacer' ? d.plan.revisiones[m.id]?.cuando : undefined, d.medicion)");
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
    // (en la tarjeta de la misión, que salió a su módulo: missionCard.ts)
    expect(leer('missionCard.ts')).toContain("paso.ir?.doc && (paso.hecho || !pasoAbierto(m.id, sigue))) {");
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
    expect(director).toContain("· ${tx('dq.titulo')}</h2>${((paro) => (paro ? lineaDeParo(paro) : ''))(paroReciente())}${opcionesDq()}</div>");
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
    expect(panel).toContain("${conMomentos ? `<button type=\"button\" class=\"boton-suave ps-momentos\" data-ps-momentos>${esc(t('sonidos.momentos'))}</button>` : ''}");
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

  it('la línea viva va pegada al pie de lo enfocado, con un botón que la oculta o la muestra, y la ventana se ajusta (linea-en-enfoque.md)', () => {
    // Montada con el velo, encima de él, con su caja para la línea y su botón; ningún clic se escucha en zen.ts
    expect(zen).toContain("franja.className = 'franja-linea';");
    expect(zen).toContain('<div class="lv-caja" id="linea-enfoque"></div><button type="button" class="franja-linea-boton" data-franja-linea aria-pressed="true">${esc(t(\'enfoque.ocultarLinea\'))}</button>');
    expect(zen).toContain('document.body.append(velo, salida, franja);');
    // Fuera del enfoque, y en pantallas angostas o bajas, no sale
    expect(css).toContain('.franja-linea { display: none; }');
    const enfoque = css.slice(css.indexOf('@media (min-width: 760px) and (min-height: 560px) {'));
    const franja = enfoque.match(/html:is\(\.enfoque, \.enfoque-mision\) \.franja-linea \{[^}]*\}/)?.[0] ?? '';
    expect(franja).toContain('position: fixed');
    expect(franja).toContain('bottom: var(--franja-pie, 24px)');
    expect(franja).toContain('width: min(1200px, calc(92 * var(--vw)))');
    expect(franja).toContain('height: var(--franja-linea)');
    // La ventana, del mismo ancho, no pasa del alto que le queda
    const ventana = enfoque.match(/html:is\(\.enfoque, \.enfoque-mision\) :is\(\.docs > \.lector, \.mision-c\.sigue\.mia\) \{[^}]*\}/)?.[0] ?? '';
    expect(ventana).toContain('bottom: calc(var(--pie-enfoque) + var(--franja-linea));');
    expect(ventana).toContain('- var(--pie-enfoque) - var(--franja-linea));');
    // Oculta, queda solo su botón, y la ventana toma el espacio
    expect(enfoque).toContain('html.linea-enfoque-oculta:is(.enfoque, .enfoque-mision) { --franja-linea: 34px; }');
    expect(css).toContain('html.linea-enfoque-oculta .franja-linea .lv-caja { display: none; }');
    // Su botón, encima del dibujo, abajo a la derecha, sin una fila aparte que la haga más alta (nmvtsyk28tit)
    expect(css).toMatch(/\.franja-linea-boton \{ position: absolute; right: 10px; bottom: 6px;/);
    expect(css).toContain('html.linea-enfoque-oculta .franja-linea-boton { position: static;');
    // «← Volver a tu misión», debajo de la franja, en el espacio que se le guarda al pie, nunca encima de la línea (nmvtsw50utit)
    expect(enfoque).toContain('html:is(.enfoque, .enfoque-mision):has(.volver-flotante) { --pie-enfoque: 78px; }');
    expect(enfoque).toContain('html:is(.enfoque, .enfoque-mision) .volver-flotante { bottom: max(8px, calc((var(--franja-pie, 24px) - 54px) / 2)); }');
    expect(enfoque).not.toMatch(/\.volver-flotante \{ bottom: calc\(var\(--franja-pie, 24px\)[^}]*\+ var\(--franja-linea\)/);
    // El aviso de misión completa, encima de la franja y sin oscurecerla (nmvttfeimtit)
    const aviso = enfoque.match(/html:is\(\.enfoque, \.enfoque-mision\):not\(\.linea-enfoque-oculta\) \.celebracion \{[^}]*\}/)?.[0] ?? '';
    expect(aviso).toContain('inset: 16px 0 calc(var(--franja-pie, 24px) + var(--franja-linea) + 14px)');
    expect(aviso).toContain('width: min(760px');
    // Bajo el aviso, a la vista solo el área del dibujo, sin una franja de lado a lado (nmvtuuqiatit)
    const velo = enfoque.match(/\.celebracion::backdrop \{[^}]*\}/)?.[0] ?? '';
    expect(velo).toContain('clip-path: polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, var(--hueco-i) var(--hueco-a)');
    expect(velo).toContain('--hueco-i: calc(50% - min(1200px, calc(92 * var(--vw))) / 2)');
    expect(velo).toContain('--hueco-b: calc(100% - var(--franja-pie, 24px))');
    expect(enfoque).not.toContain('clip-path: inset(0 0 calc(var(--franja-pie, 24px) + var(--franja-linea)) 0)');
    // El botón se recuerda en este computador, viene encendida y repinta la línea con el ancho que le queda
    expect(director).toContain("} else if ((e.target as HTMLElement).closest('[data-franja-linea]')) ponerLineaEnfoque(!lineaEnfoquePuesta());");
    expect(director).toContain("const lineaEnfoquePuesta = () => localStorage.getItem(CLAVE_LINEA_ENFOQUE) !== '0';");
    const poner = director.match(/function ponerLineaEnfoque\(si: boolean\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(poner).toContain("document.documentElement.classList.toggle('linea-enfoque-oculta', !si);");
    expect(poner).toContain('repintarLineaViva()');
    const aplicar = director.match(/function aplicarEnfoque\(\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(aplicar).toContain('repintarLineaViva()');
    // La línea la pinta en las dos cajas, la de la barra y la de la franja, con más tiempo a la vista en la franja
    const linea = leer('lineaViva.ts');
    expect(linea).toContain("const CAJAS = ['linea-viva', 'linea-enfoque'] as const;");
    expect(linea).toContain('const alto = Math.max(ALTO_FRANJA, h);');
    expect(linea).toContain('{ alto, ancho: Math.max(ANCHO_BARRA, (alto * w) / h), fondo: true, corrido }');
  });

  it('la ventana y la franja se centran juntas en el alto, se vea la línea o solo su botón (nota de voz nmvtn6ypetit, 29 de octubre de 2026)', () => {
    const enfoque = css.slice(css.indexOf('@media (min-width: 760px) and (min-height: 560px) {'));
    // La ventana va al centro del alto que le deja la franja (margin: auto, sin pegarse al pie), que es lo mismo que
    // centrar las dos juntas: (arriba + alto - 24 - franja) / 2 es el centro de la ventana con el grupo centrado
    const ventana = enfoque.match(/html:is\(\.enfoque, \.enfoque-mision\) :is\(\.docs > \.lector, \.mision-c\.sigue\.mia\) \{[^}]*\}/)?.[0] ?? '';
    expect(ventana).not.toContain('margin-bottom: 0');
    expect(css).toMatch(/html\.enfoque \.docs > \.lector, html\.enfoque-mision \.mision-c\.sigue\.mia \{\s*position: fixed; inset: var\(--enfoque-arriba, 24px\) 24px 24px; z-index: 40; margin: auto;/);
    // Y la franja se pega a su borde de abajo: pegarFranja mide la ventana y deja la distancia al pie en --franja-pie
    const pegar = director.match(/function pegarFranja\(caja: HTMLElement\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(pegar).toContain("html.style.setProperty('--franja-pie', `${Math.max(0, Math.round(altoDeVentana() - c.bottom - franja.offsetHeight))}px`);");
    const ubicar = director.match(/function ubicarEnfoque\(\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(ubicar).toContain('pegarFranja(caja);');
    expect(ubicar).toContain("html.style.removeProperty('--franja-pie');");
    // Se recalcula al mostrar u ocultar la línea y cada vez que lo enfocado cambia de alto
    const poner = director.match(/function ponerLineaEnfoque\(si: boolean\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(poner).toContain('if (enfoque) ubicarEnfoque();');
    expect(ubicar).toContain('medirEnfocada?.observe(caja);');
    expect(director).toContain('new ResizeObserver(() => { if (enfoque) ubicarEnfoque(); })');
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
