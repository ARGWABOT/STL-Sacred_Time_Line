// El aviso de misión completada (pedido pd_toast_mision; nota de voz del titular nmvvbmk29tit, 30 de octubre de 2026): un
// aviso a un lado que se va solo, en lugar de la ventana que pedía un clic antes de la misión siguiente.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { pasosVistos, type EstadoDirector, type Mision, type Proyecto } from '../../src/director/director';
import { AIRE_AVISOS, AVISO_AUDIO_MS, AVISO_CON_ATAJO_MS, AVISO_MS, DURA_CON_BOTON_MS, DURA_MS, avanceDelPaso, bajoAvisoMision, completaLaMision, completasSinEntregar, conEntregasEnVuelo, duracionAviso, htmlAvisoMision, opcionesHabilitadas, rotuloDelPaso } from './avisoMision';
import { t } from './textos';
import { es } from './textos/es';

const leer = (ruta: string) => readFileSync(join(__dirname, ruta), 'utf-8').replace(/\r\n/g, '\n');
const aviso = { titulo: 'Mira la <lista>', xp: 15, estado: 'Pide la revisión cuando quieras' };
/** completarSiToca y avisarEntrega, juntas: la entrega y su aviso. */
const entrega = (director: string) => director.match(/async function completarSiToca\([\s\S]*?\nfunction avisarEntrega\([\s\S]*?\n\}/)?.[0] ?? '';

describe('un paso que avanza se nota (nota de voz del titular nmvy2yvsitit, 1 de noviembre de 2026)', () => {
  // La misión de esa nota: dos pasos con la misma opción, en el mismo lugar
  const otra = 'Algo fue distinto (te cuento con ✉)';
  const m = { id: 'm', para: 'titular', pasos: [{ texto: 'Silencia tu micrófono.', opciones: ['Se detuvo', otra] }, { texto: 'Quita el silencio.', opciones: ['Grabó', otra] }] } as unknown as Mision;
  const nota = { id: 'n', de: 'titular', cuando: '2026-11-01T17:04:12.825Z', audio: 'notas/n.webm', sobre: { tipo: 'mision', id: 'm', seccion: 'Paso 1', eleccion: otra } };

  it('elegir con un comentario de voz marca el paso, y lo que se muestra dice a cuál se llegó', () => {
    const estado = { notas: [nota], pasos: {} } as unknown as EstadoDirector;
    expect(pasosVistos(m, {} as Proyecto, estado)).toEqual([0]);
    const avance = avanceDelPaso(m.pasos.length, [0], 0);
    expect(avance).toEqual({ hecho: 1, sigue: 2 });
    expect(t('paso.sigueAviso', avance!)).toContain('2');
    // Las mismas opciones, en el mismo lugar: lo que distingue un paso del otro es su rótulo
    expect(rotuloDelPaso(0, 2)).not.toBe(rotuloDelPaso(1, 2));
    expect(rotuloDelPaso(1, 2)).toContain('2');
    expect(rotuloDelPaso(1, 2)).not.toContain('2 de');
  });

  it('el último no anuncia otro, y una misión de un solo paso no lleva rótulo', () => {
    expect(avanceDelPaso(2, [0, 1], 1)).toBeNull();
    expect(avanceDelPaso(3, [0, 2], 0)).toEqual({ hecho: 1, sigue: 2 });
    expect(rotuloDelPaso(0, 1)).toBe('');
  });

  it('en la página: el rótulo, el realce y un aviso que no depende de si la nota trae audio', () => {
    const app = leer('app.ts');
    expect(app).toContain('rotuloDelPaso(i, m.pasos.length)');
    expect(app).toContain("' paso-recien'");
    expect(app).toContain("if (eligio && avance) avisar(tx('paso.sigueAviso', avance), true);");
    expect(leer('director.css')).toContain('.rotulo-paso');
  });
});

describe('la misión completada, en un aviso a un lado (pd_toast_mision)', () => {
  it('dice la misión, su XP y en qué quedó, sin un botón que haya que oprimir para seguir', () => {
    const html = htmlAvisoMision(aviso);
    expect(html).toContain('Misión completada');
    expect(html).toContain('+15 XP');
    expect(html).toContain('Mira la &lt;lista&gt;');
    expect(html).not.toContain('data-siguiente');
    expect(html).not.toContain('autofocus');
    expect(html).not.toContain('Ir a mi misión');
    // En otra sección, trae «Ir a mi misión →», sin que haga falta usarlo
    expect(htmlAvisoMision({ ...aviso, irAMision: true })).toContain('data-ir-mision-aviso>Ir a mi misión →</button>');
  });

  it('se va solo a los 3 segundos y algo; con «Ir a mi misión», un poco más; con la recomendación de pedir la revisión, hasta cerrarlo', () => {
    expect(DURA_MS).toBeGreaterThanOrEqual(3000);
    expect(DURA_MS).toBeLessThanOrEqual(4000);
    expect(duracionAviso(aviso)).toBe(DURA_MS);
    expect(duracionAviso({ ...aviso, irAMision: true })).toBe(DURA_CON_BOTON_MS);
    expect(duracionAviso({ ...aviso, recomienda: '<div class="recomienda-revision"></div>' })).toBeNull();
  });

  it('no es un diálogo: completar una misión no abre ninguno, suena la entrega y, en «Hoy», la misión siguiente queda a la vista', () => {
    const director = leer('app.ts');
    const completar = entrega(director);
    expect(completar).not.toContain("document.createElement('dialog')");
    expect(completar).not.toContain('showModal()');
    expect(completar).toContain("sonar('entrega');");
    expect(completar).toContain('mostrarAvisoMision({ titulo: m.titulo, xp: m.xp, estado,');
    // En el enfoque de la misión, la siguiente ocupa su lugar sin volver a navegar: el gráfico de su pie sigue (nmvvdc2f4tit)
    expect(completar).toContain("if (sigue && enHoy && !enfoque.startsWith('mision-')) void ir(sigue);");
    const modulo = leer('avisoMision.ts');
    expect(modulo).toContain("document.createElement('aside')");
    expect(modulo).not.toMatch(/createElement\('dialog'\)|showModal/);
    // A un lado, fijo y encima, sin velo: no tapa la misión siguiente ni toma el foco
    const css = leer('director.css');
    expect(css).toMatch(/\.aviso-mision \{ position: fixed; top: 76px; right: 16px;/);
  });

  it('entregada sola, no aparece la ventana «Lo hice»: ni mientras se entrega ni con el botón que queda si falló (nmvvdc2f4tit)', () => {
    const director = leer('app.ts');
    const completar = entrega(director);
    // Una sola entrega por misión, y mientras va, su «Entregar al director» no está (el botón central lo oprimía)
    expect(completar).toContain('if (entregandoSola.has(id)) return false;');
    expect(completar).toContain('b.hidden = true');
    // En la tarjeta de la misión (missionCard.ts), que la recibe de la página
    expect(leer('missionCard.ts')).toContain("(todos || !m.pasos.length) && !entregandoSola.has(m.id)) acciones.push(");
    expect(director).toContain('entregandoSola, pasosHechos, pasoAbierto,');
    // Con todos sus pasos marcados, el botón entrega como al marcar el último, antes de la ventana
    const entregar = director.match(/\} else if \(ds\.entregar\) \{[\s\S]*?await pedir\(/)?.[0] ?? '';
    expect(entregar).toContain('m.pasos.every((_, k) => hechosYa.includes(k))');
    expect(entregar).toContain('await completarSiToca(m.id, accion(');
    expect(entregar.indexOf('return;')).toBeGreaterThan(entregar.indexOf('completarSiToca'));
  });

  it('los demás avisos van en el mismo estilo, arriba a la derecha, angostos y altos, y lo bueno se va pronto (nmvvdc2f4tit)', () => {
    expect(AVISO_MS).toBeLessThanOrEqual(DURA_MS + 1000);
    expect(AVISO_CON_ATAJO_MS).toBeLessThan(DURA_CON_BOTON_MS);
    const regla = leer('estilos.css').match(/\n\.aviso-flotante \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(regla).toContain('top: calc(76px + var(--bajo-aviso-mision, 0px)); right: 16px;');
    expect(regla).toContain('width: min(300px');
    expect(regla).toContain('border-left-width: 4px');
    expect(regla).not.toMatch(/bottom:|translateX/);
    const avisar = leer('app.ts').match(/function avisar\([\s\S]*?\n\}/)?.[0] ?? '';
    expect(avisar).toContain('bien ? dura ?? (ir ? AVISO_CON_ATAJO_MS : AVISO_MS)');
  });

  it('la misión siguiente toma el lugar de la entregada al instante, sin esperar al servidor, y vuelve si no se guardó (nmvvi7svwtit)', () => {
    const vacio = { entregas: { t_a: { cuando: '1', quien: 'Ana' } }, notas: [] };
    const enVuelo = new Map([['t_b', { cuando: '2', quien: 'Ana' }], ['t_a', { cuando: '9', quien: 'Otro' }]]);
    // Lo que llega del servidor antes de guardarla no la deshace, y lo que el servidor ya tiene manda
    expect(conEntregasEnVuelo(vacio, enVuelo).entregas).toEqual({ t_a: { cuando: '1', quien: 'Ana' }, t_b: { cuando: '2', quien: 'Ana' } });
    expect(conEntregasEnVuelo(vacio, new Map())).toBe(vacio);
    const completar = entrega(leer('app.ts'));
    // Ya entregada aquí antes del primer await: el aviso y la siguiente salen antes de esperar al servidor
    expect(completar.indexOf('entregasEnVuelo.set(id')).toBeGreaterThan(-1);
    expect(completar.indexOf('avisarEntrega(m)')).toBeLessThan(completar.indexOf('await guardado'));
    expect(completar.indexOf('entregasEnVuelo.delete(id)')).toBeGreaterThan(completar.indexOf('await guardado'));
    expect(completar).toMatch(/function avisarEntrega\(m: Mision\) \{\n {2}sonar\('entrega'\);[\s\S]*?\n {2}pintar\(\);/);
    // Cada estado que llega del servidor (una acción o la recarga) conserva las entregas en vuelo
    const director = leer('app.ts');
    expect(director).toContain('if (ultima) d.estado = conEntregasEnVuelo(j.estado, entregasEnVuelo);');
    expect(director).toContain('if (d?.activo === nuevo.activo) nuevo.estado = conEntregasEnVuelo(nuevo.estado, entregasEnVuelo);');
  });

  it('una nota de voz avisa una sola vez, cuando ya está en texto: «Tu audio fue traducido a texto», con su atajo y 3 segundos (nmvvi8xi2tit)', () => {
    expect(es['aviso.audioTraducido']).toBe('Tu audio fue traducido a texto.');
    expect(AVISO_AUDIO_MS).toBeLessThanOrEqual(3000);
    const director = leer('app.ts');
    const vigilar = director.match(/function vigilarTranscripciones\([\s\S]*?\n\}/)?.[0] ?? '';
    expect(vigilar).toContain("avisar(tx('aviso.audioTraducido'), true, undefined, nota ? { etiqueta: tx(donde === 'preguntas' ? 'aviso.verPreguntas' : 'aviso.verBuzon')");
    expect(vigilar).toContain(', false, AVISO_AUDIO_MS);');
    expect(vigilar).not.toContain('quedó transcrito');
    // Al guardarla no se anuncia lo que se va a hacer con el audio
    expect(director).not.toContain('Tu audio ya se está transcribiendo');
    expect(director).toContain('if (!cuerpo.audio && hecho) avisar(`${hecho}${pistaYaLoDije(');
  });

  it('los avisos van apilados, el de abajo bajo el de misión completada, nunca uno encima del otro (nmvvk7nw2tit)', () => {
    // Sin el de misión completada, el de abajo queda en su lugar; con él, baja su alto más el aire entre los dos
    expect(bajoAvisoMision(null)).toBe(0);
    expect(bajoAvisoMision(0)).toBe(0);
    expect(bajoAvisoMision(96)).toBe(96 + AIRE_AVISOS);
    const css = leer('estilos.css');
    expect(css).toContain('top: calc(76px + var(--bajo-aviso-mision, 0px));');
    expect(css).toContain('top: calc(64px + var(--bajo-aviso-mision, 0px));');
    // Se pone al día al mostrarlo, al quitarlo solo y al quitarlo porque la entrega no se guardó
    const modulo = leer('avisoMision.ts');
    expect(modulo).toMatch(/document\.body\.append\(el\);\n {2}apilar\(el\);/);
    expect(modulo).toMatch(/el\.classList\.add\('saliendo'\);\n {4}apilar\(null\);/);
    expect(leer('app.ts')).not.toContain("document.querySelector('.aviso-mision')?.remove();");
  });

  it('una misión con todos sus pasos marcados y sin entregar se entrega sola, también si el último se marcó con una nota (nmw2rpl8atit)', () => {
    // Su último paso, con una opción elegida, «Ya lo comenté antes» o «Ya te lo dije en mi comentario»: queda marcado y,
    // si la entrega se cortó (una recarga al cerrarse la revisión), nada la intentaba otra vez
    const misiones = [{ id: 't_globitos', pasos: [{ texto: 'Mira', opciones: ['Se lee bien', 'No'] }] }, { id: 't_dos', pasos: ['a', 'b'] }, { id: 't_vacia', pasos: [] }];
    const hechos = (id: string) => ({ t_globitos: [0], t_dos: [1], t_vacia: [] } as Record<string, number[]>)[id] ?? [];
    expect(completasSinEntregar(misiones, hechos)).toEqual(['t_globitos']);
    expect(completasSinEntregar(misiones, (id) => (id === 't_dos' ? [0, 1] : []))).toEqual(['t_dos']);
    const director = leer('app.ts');
    // La vigilancia de los pasos, sin nada nuevo que marcar, entrega las que ya están completas, una vez cada una
    const mirar = director.match(/async function mirarPasosHechos\([\s\S]*?\n\}/)?.[0] ?? '';
    expect(mirar).toContain('if (!nuevos.length) return entregarCompletas(yo);');
    const sueltas = director.match(/async function entregarCompletas\([\s\S]*?\n\}/)?.[0] ?? '';
    expect(sueltas).toContain("['pendiente', 'en_curso'].includes(estadoMision(m, d.plan, d.estado))");
    expect(sueltas).not.toContain("'rehacer'");
    expect(sueltas).toContain('entregaReintentada.add(id);');
    expect(sueltas).toContain('await completarSiToca(id, accion(');
    // Pedida mientras ya miraba, se mira otra vez al terminar: la nota del último paso no se queda sin ver
    const ver = director.match(/async function verPasosHechos\(\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(ver).toContain('if (viendoPasos) return void (verPasosOtraVez = true);');
    expect(ver).toContain('void verPasosHechos();');
    // Elegir, «Ya lo comenté antes» y «Ya te lo dije» dejan su nota, y la nota llama a la vigilancia de los pasos
    expect(director).toContain("if (ultima && cuerpo.tipo !== 'paso') void verPasosHechos();");
  });

  it('un aviso por suceso: elegir en el último paso deja solo el de misión completada (nmvvk9zwktit)', () => {
    expect(completaLaMision(2, [0], 1)).toBe(true);
    expect(completaLaMision(2, [], 1)).toBe(false);
    expect(completaLaMision(1, [], 0)).toBe(true);
    expect(completaLaMision(0, [], 0)).toBe(false);
    const director = leer('app.ts');
    const elegir = director.match(/async function elegirEnPaso\([\s\S]*?\n\}/)?.[0] ?? '';
    expect(elegir).toContain('const ultimo = ultimoPaso(id, i);');
    expect(elegir).toContain("ultimo ? '' : tx('paso.eligesAviso', { eleccion: recortar(eleccion, 40) })");
    expect(director).toContain("ultimoPaso(id, Number(i)) ? '' : tx('paso.listoComentario')");
    expect(es['paso.listoComentario']).toBe('Listo: el paso queda con tu comentario.');
    // Sin texto no hay aviso: no se encima uno vacío ni se apaga el que estaba
    expect(director).toContain('if (!cuerpo.audio && hecho) avisar(');
  });

  it('«Ya te lo dije en mi comentario» se puede usar con el comentario aunque no se haya visitado el enlace; lo demás sigue esperando la visita (nmw40q410tit)', () => {
    // Con comentario y sin visita: ese botón y «Ya lo comenté antes» están libres; las opciones esperan
    expect(opcionesHabilitadas({ requiereVisita: true, visitado: false, comento: true })).toEqual({ opciones: false, yaLoDijeSale: true, yaLoDijeHabilitado: true, yaLoComenteHabilitado: true });
    // Sin comentario y sin visita: «Ya te lo dije» no sale, las opciones esperan y «Ya lo comenté antes» se usa (nmw5gful2tit)
    expect(opcionesHabilitadas({ requiereVisita: true, visitado: false, comento: false })).toEqual({ opciones: false, yaLoDijeSale: false, yaLoDijeHabilitado: false, yaLoComenteHabilitado: true });
    // Con la visita, todo libre como antes
    expect(opcionesHabilitadas({ requiereVisita: true, visitado: true, comento: true })).toEqual({ opciones: true, yaLoDijeSale: true, yaLoDijeHabilitado: true, yaLoComenteHabilitado: true });
    expect(opcionesHabilitadas({ requiereVisita: true, visitado: true, comento: false }).opciones).toBe(true);
    // Un paso que no manda a ver nada no espera visita
    expect(opcionesHabilitadas({ requiereVisita: false, visitado: false, comento: false }).opciones).toBe(true);
    // En la página: el bloque de antes de la visita usa esa decisión, y el clic no vuelve a pedir la visita
    const app = leer('app.ts');
    expect(app).toContain('const libre = opcionesHabilitadas({ requiereVisita: !!ir, visitado: !ir || pasoAbierto(m.id, i), comento: !!yaLoDijo });');
    expect(app).toContain("${yaLoDije(libre.yaLoDijeHabilitado ? `data-ya-lo-dije=\"${esc(m.id)}|${i}\"` : 'disabled', libre.yaLoComenteHabilitado ? `data-ya-lo-dije=\"${esc(m.id)}|${i}\"` : 'disabled')}");
    // «Ya lo comenté antes» lleva su propio atributo (yaLoComente cambia data-ya-lo-dije por data-ya-lo-comente) y su clic no pide la visita
    expect(app).toContain("atributos.replace('data-ya-lo-dije', 'data-ya-lo-comente')");
    const clicComente = app.slice(app.indexOf('} else if (ds.yaLoComente) {'), app.indexOf('} else if (ds.hazlo) {'));
    expect(clicComente).not.toMatch(/pasoAbierto|abierto/);
    const clic = app.slice(app.indexOf('} else if (ds.yaLoDije) {'), app.indexOf('} else if (ds.yaLoComente) {'));
    expect(clic).not.toMatch(/pasoAbierto|abierto/);
  });

  it('con poco texto: la entrega dice solo en qué quedó, en una frase corta (nmvvk7nw2tit)', () => {
    const completar = entrega(leer('app.ts'));
    // Cada frase cabe en una línea del aviso angosto
    for (const [clave, frase] of [['accion.vaSiguiente', 'Va en la revisión siguiente.'], ['entrega.entraPedida', 'Entra en la revisión que pediste.'], ['entrega.pideCuandoQuieras', 'Pide la revisión cuando quieras.'], ['entrega.eranTodas', 'Eran todas por ahora.']] as const) {
      expect(completar).toContain(`tx('${clave}')`);
      expect(es[clave]).toBe(frase);
      expect(frase.length).toBeLessThan(40);
    }
    expect(completar).not.toContain('Quedó para la revisión siguiente: entregarla no pidió ninguna');
    // El de un paso con el director revisando, igual de corto
    expect(leer('app.ts')).toContain("tx('accion.elegisteSiguiente', { eleccion: recortar((cuerpo.sobre as { eleccion: string }).eleccion, 40) })");
    expect(es['accion.elegisteSiguiente']).toBe('Elegiste «{eleccion}»: va en la revisión siguiente.');
  });
});
