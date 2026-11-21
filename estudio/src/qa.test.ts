// La pestaña de QA, primer tramo (pd_pestana_qa; pestana-qa.md › 2 y 7): la aplicación en un marco que llena la ventana,
// y la que rehúsa el marco, como antes, con un aviso.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BORDE_QA, CABECERAS_QA, claveDirectorQa, claveEstacionQa, conEstacion, conEstacionRecordada, marcaSinCache, PARAM_SIN_CACHE, recargaSinCache, direccionQa, directorFlotante, escalaQa, esPaginaDelStudio, MARGEN_QA, MODULO_QA, notaDeQa, paginaQa, rehusaElMarco, RUTA_NOTA_QA, RUTA_QA, TAMANOS_QA, TIPO_FOTONOTA, VENTANA_STUDIO } from './qa';
import { barraDeCaptura, dibujarTrazo, fotoAlEnviar, GROSORES, ROJO } from './capturaQa';
import { arranqueDeLaCuenta } from './precargaCierre';

const cab = (h: Record<string, string>) => ({ get: (n: string) => h[n.toLowerCase()] ?? null });
const APP = 'http://localhost:8090';
const STUDIO = 'http://localhost:5180';
const textos = { titulo: 'QA · app', rehusa: 'app does not allow being shown inside the QA tab', abrirAqui: 'Open it now' };

describe('la pestaña de QA de cada proyecto (pd_pestana_qa)', () => {
  it('su dirección lleva el paso del atajo', () => {
    expect(direccionQa('t_ver app', 3)).toBe(`${RUTA_QA}?mision=t_ver%20app&paso=3`);
  });

  it('carga la aplicación por su puerta en un marco que llena la ventana', () => {
    const html = paginaQa({ puerta: `${APP}/stl-puerta?rol=gerente&ir=%2Fpanel`, idioma: 'en', textos, rehusa: false });
    expect(html).toContain('<iframe src="http://localhost:8090/stl-puerta?rol=gerente&amp;ir=%2Fpanel"');
    expect(html).toMatch(/iframe\{position:fixed;inset:0;width:100%;height:100%/);
    expect(html).toContain('<title>QA · app</title>');
    expect(html).toContain('lang="en"');
    expect(html).not.toContain('data-qa-rehusa');
  });

  it('una aplicación que rehúsa el marco se abre como antes, en la misma pestaña, con un aviso y su botón', () => {
    const html = paginaQa({ puerta: `${APP}/stl-puerta?rol=x&ir=%2F`, idioma: 'en', textos, rehusa: true, esperaMs: 3000 });
    expect(html).not.toContain('<iframe');
    expect(html).toContain('data-qa-rehusa');
    expect(html).toContain(textos.rehusa);
    expect(html).toContain('location.replace("http://localhost:8090/stl-puerta?rol=x&ir=%2F")},3000)');
    // Nada de la dirección rompe el guion
    expect(paginaQa({ puerta: `${APP}/</script><b>`, idioma: 'en', textos, rehusa: true })).not.toContain('</script><b>');
  });

  it('lee de las cabeceras si la aplicación rehúsa el marco', () => {
    expect(rehusaElMarco(cab({}), APP, STUDIO)).toBe(false);
    expect(rehusaElMarco(cab({ 'x-frame-options': 'DENY' }), APP, STUDIO)).toBe(true);
    expect(rehusaElMarco(cab({ 'x-frame-options': 'SAMEORIGIN' }), APP, STUDIO)).toBe(true);
    expect(rehusaElMarco(cab({ 'x-frame-options': 'SAMEORIGIN' }), STUDIO, STUDIO)).toBe(false);
    expect(rehusaElMarco(cab({ 'content-security-policy': "default-src 'self'; frame-ancestors 'none'" }), APP, STUDIO)).toBe(true);
    expect(rehusaElMarco(cab({ 'content-security-policy': "frame-ancestors 'self'" }), APP, STUDIO)).toBe(true);
    expect(rehusaElMarco(cab({ 'content-security-policy': 'frame-ancestors http://localhost:5180' }), APP, STUDIO)).toBe(false);
    expect(rehusaElMarco(cab({ 'content-security-policy': 'frame-ancestors http://localhost:*' }), APP, STUDIO)).toBe(false);
    expect(rehusaElMarco(cab({ 'content-security-policy': "default-src 'self'" }), APP, STUDIO)).toBe(false);
  });

  it('el atajo de un paso abre la pestaña de QA, y el servidor la sirve con los candados del atajo', () => {
    const app = readFileSync(new URL('./app.ts', import.meta.url), 'utf8');
    expect(app).toContain('abrirElAtajo(direccionQa(mision, paso), proyecto)');
    const api = readFileSync(new URL('../servidor/api.ts', import.meta.url), 'utf8');
    const ruta = api.slice(api.indexOf("ruta === '/qa'"), api.indexOf("ruta === '/qa'") + 6000);
    expect(ruta).toContain('candadosDelAtajo(');
    expect(ruta).toContain('rehusaElMarco(cabeceras');
    expect(ruta).toContain('paginaQa({ puerta: direccionDeLaPuerta({ ...atajo, url: marcaSinCache(atajo.url, Date.now().toString(36)) })');
    expect(ruta).toContain('director: directorQa() }));');
  });
});

describe('la pestaña de QA: el director flotante y su nota, con el diálogo del Studio (pd_pestana_qa)', () => {
  const tx = { paso: 'Step 2 of «See it»', nota: 'Note', captura: 'Take a photo note', volver: 'Back to my mission', plegar: 'Fold', desplegar: 'Unfold', mover: 'Drag', dispositivos: 'View as', escritorio: 'Desktop', tableta: 'Tablet', telefono: 'Phone', avisoDispositivo: 'Only the size' };
  const director = { proyecto: 'app', mision: 't_ver', paso: 1, textos: tx };
  const leer = (r: string) => readFileSync(new URL(r, import.meta.url), 'utf8');

  it('va sobre la aplicación, con «Tomar captura», «Nota» y «Volver a mi misión», y empieza abajo a la izquierda (nmwpmhs37tit)', () => {
    const html = paginaQa({ puerta: `${APP}/stl-puerta?rol=x&ir=%2F`, idioma: 'en', textos, rehusa: false, director });
    expect(html.indexOf('data-qa-marco')).toBeLessThan(html.indexOf('data-qa-director'));
    const f = directorFlotante(director);
    // Una sola operación, la fotonota (nmwpnvo38tit): la nota y la captura ya no van aparte
    expect(f).toContain('<button type="button" data-qa-captura>Take a photo note</button>');
    expect(f).not.toContain('data-qa-nota');
    expect(f).toContain('<button type="button" data-qa-volver>Back to my mission</button>');
    expect(f).not.toContain('disabled');
    expect(f).toContain('.qa-dir{position:fixed;left:20px;bottom:20px');
    expect(f).toContain('Step 2 of «See it»');
    // Sin el director, la página del primer tramo queda igual; y la que rehúsa el marco no lo lleva
    expect(paginaQa({ puerta: APP, idioma: 'en', textos, rehusa: false })).not.toContain('data-qa-director');
    expect(paginaQa({ puerta: APP, idioma: 'en', textos, rehusa: false })).not.toContain(MODULO_QA);
    expect(paginaQa({ puerta: APP, idioma: 'en', textos, rehusa: true, director })).not.toContain('data-qa-director');
  });

  it('se arrastra y se pliega, y recuerda por proyecto cómo quedó: abierto la primera vez (nmwpkjjzqtit)', () => {
    const f = directorFlotante(director);
    expect(claveDirectorQa('app')).toBe('stl-qa-director:app');
    expect(f).toContain('"clave":"stl-qa-director:app"');
    expect(f).toContain('localStorage.getItem(D.clave)');
    expect(f).toContain('localStorage.setItem(D.clave,JSON.stringify(g))');
    expect(f).toContain('ponerPlegado(g.plegado===true)');
    expect(f).toContain('g.lugar={x:r.left,y:r.top}');
    expect(f).toContain("addEventListener('pointerdown'");
  });

  it('«Nota» abre el mismo diálogo de notas del Studio, con sus estilos, su grabadora y sus adjuntos (nmwplyqprtit)', () => {
    const html = paginaQa({ puerta: APP, idioma: 'en', textos, rehusa: false, director });
    expect(html).toContain('<link rel="stylesheet" href="/estudio/src/estilos.css">');
    expect(html).toContain('<dialog id="dialogo" class="dialogo-director"></dialog>');
    expect(html).toContain(`<script type="module" src="${MODULO_QA}"></script>`);
    expect(html).toContain('<script type="application/json" id="qa-datos">{"proyecto":"app","mision":"t_ver","paso":1,"pasoTexto":"Step 2 of «See it»"}</script>');
    // La pestaña de QA ya no abre el diálogo de notas: su única nota es la fotonota, solo voz (nmwpnvo38tit)
    const pagina = leer('./qaPagina.ts');
    expect(pagina).not.toContain("from './dialogoNota'");
    // Llega como «Falla» (nmwpow115tit, «Keep "Bug"»), y no hay tecla que la tome (nmwpowzwatit): solo su botón
    expect(pagina).toContain("texto: '', tipoNota: TIPO_FOTONOTA, audio, adjuntos");
    expect(TIPO_FOTONOTA).toBe('falla');
    expect(pagina).not.toMatch(/addEventListener\(['"]key(down|up|press)/);
    const app = leer('./app.ts');
    expect(app).toContain("import { campoTipo, grabadoraDelSobre, pedir, ponerContextoDelDialogo, type Campo, type Dicho } from './dialogoNota';");
    expect(app).not.toMatch(/\nfunction pedir\(/);
  });

  it('«Tomar captura» congela la vista, la marca en rojo con la barra arriba y abre la nota con la imagen y grabando (nmwpmf0i5tit)', () => {
    const barra = barraDeCaptura();
    for (const x of ['data-herramienta="rectangulo"', 'data-herramienta="lapiz"', 'data-herramienta="linea"', 'data-grosor="fino"', 'data-grosor="medio"', 'data-grosor="grueso"', 'data-deshacer', 'data-limpiar', 'data-descartar']) expect(barra).toContain(x);
    expect(barra.indexOf('class="qa-barra"')).toBe(5);
    const hecho: string[] = [];
    const lienzo = { strokeStyle: '', lineWidth: 0, lineCap: 'butt' as CanvasLineCap, lineJoin: 'miter' as CanvasLineJoin, beginPath: () => hecho.push('b'), moveTo: (x: number, y: number) => hecho.push(`m${x},${y}`), lineTo: (x: number, y: number) => hecho.push(`l${x},${y}`), stroke: () => hecho.push('s'), strokeRect: (x: number, y: number, w: number, h: number) => hecho.push(`r${x},${y},${w},${h}`) };
    dibujarTrazo(lienzo, { herramienta: 'rectangulo', grosor: 6, puntos: [{ x: 30, y: 40 }, { x: 10, y: 10 }] });
    expect(hecho).toEqual(['r10,10,20,30']);
    expect(lienzo.strokeStyle).toBe(ROJO);
    hecho.length = 0;
    dibujarTrazo(lienzo, { herramienta: 'linea', grosor: 3, puntos: [{ x: 0, y: 0 }, { x: 5, y: 5 }, { x: 9, y: 9 }] });
    expect(hecho).toEqual(['b', 'm0,0', 'l9,9', 's']);
    hecho.length = 0;
    dibujarTrazo(lienzo, { herramienta: 'lapiz', grosor: 3, puntos: [{ x: 0, y: 0 }, { x: 5, y: 5 }, { x: 9, y: 9 }] });
    expect(hecho).toEqual(['b', 'm0,0', 'l5,5', 'l9,9', 's']);
    expect(Object.values(GROSORES)).toHaveLength(3);
    const pagina = leer('./qaPagina.ts');
    expect(pagina).toContain('const vista = await congelarVista(aviso ? [director, aviso] : [director]);');
    expect(pagina).toContain('await fotonota(vista,');
    const captura = leer('./capturaQa.ts');
    expect(captura).toContain("preferCurrentTab: true");
    // Se comparte una vez por visita (nmwqko02dtit, que reemplaza nmwpnvo38tit): el flujo se suelta al cerrar la pestaña
    expect(captura).toContain('flujo?.getTracks().forEach((p) => p.stop());');
    expect(captura).toContain("addEventListener('pagehide', soltarFlujo);");
    const congelar = captura.slice(captura.indexOf('export async function congelarVista'), captura.indexOf('export interface Fotonota'));
    expect(congelar).not.toContain('p.stop()');
    expect(congelar).toContain('if (!flujo || !flujo.active)');
    // Abre grabando, cada fragmento detenido deja su foto, y Esc no tira lo grabado
    expect(captura).toContain('tomando = foto();');
    expect(captura).toContain("capa.querySelector<HTMLButtonElement>('[data-g=\"grabar\"]')?.click();");
    expect(captura).toContain("capa.addEventListener('cancel', (e) => e.preventDefault());");
  });

  it('la fotonota: cada audio con su foto, y enviar nunca suma una de más (nmwpnvo38tit, nmwqme8cbtit)', () => {
    expect(fotoAlEnviar({ fotos: 0, fragmentos: 1, cambio: false })).toBe('nueva');
    expect(fotoAlEnviar({ fotos: 1, fragmentos: 1, cambio: false })).toBe('nada');
    expect(fotoAlEnviar({ fotos: 1, fragmentos: 2, cambio: false })).toBe('nueva');
    // The drawings changed after the last photo: it is taken again in its place, never one more
    expect(fotoAlEnviar({ fotos: 2, fragmentos: 2, cambio: true })).toBe('rehacer');
    expect(fotoAlEnviar({ fotos: 0, fragmentos: 0, cambio: false })).toBe('nueva');
  });

  it('«Volver a mi misión» trae al frente la pestaña del Studio por su nombre y deja abierta la de QA (nmwplzilitit, nmwpkjw9ltit)', () => {
    const f = directorFlotante(director);
    expect(f).toContain('o.postMessage({tipo:D.volver,proyecto:D.proyecto,mision:D.mision},location.origin)');
    expect(f).toContain("var w=window.open(abierto?'':'/',D.ventana)");
    expect(f).toContain(`"ventana":"${VENTANA_STUDIO}"`);
    expect(f).not.toContain('window.close');
    const app = leer('./app.ts');
    expect(app).toContain('if (!window.name) window.name = VENTANA_STUDIO;');
    expect(app).toContain('m?.tipo !== MENSAJE_VOLVER');
    expect(app).toContain("void ir({ vista: 'misiones', ancla: `mision-${m.mision}`, etiqueta: '' })");
  });

  it('su nota va al Buzón del proyecto, ligada al paso y a la página, con su audio y su imagen, y aparece sola en el Buzón abierto (nmwpmgesctit)', () => {
    const desde = (p: string) => `From the QA tab, on ${p}`;
    expect(notaDeQa({ proyecto: 'app', mision: 't_ver', paso: 1, pagina: `${APP}/panel`, texto: ' The total is wrong ', tipoNota: 'falla' }, desde)).toEqual({
      tipo: 'comentar', sobre: { tipo: 'mision', id: 't_ver', seccion: 'Paso 2' }, texto: `From the QA tab, on ${APP}/panel\n\nThe total is wrong`, tipoNota: 'falla',
    });
    // Solo con audio o solo con la captura también vale, como en el ✉
    const conTodo = notaDeQa({ mision: 't_ver', paso: 0, pagina: `${APP}/x`, texto: '', audio: 'data:audio/webm;base64,AA', adjuntos: [{ nombre: 'c.png', datos: 'data:image/png;base64,AA' }, { nombre: 3 }] }, desde);
    expect(conTodo).toMatchObject({ texto: `From the QA tab, on ${APP}/x`, audio: 'data:audio/webm;base64,AA', adjuntos: [{ nombre: 'c.png', datos: 'data:image/png;base64,AA' }] });
    expect(notaDeQa({ mision: 't_ver', paso: 0, texto: 'x', audio: 'javascript:1' }, desde)).not.toHaveProperty('audio');
    expect(notaDeQa({ mision: 't_ver', paso: 0, texto: 'x' }, desde)?.texto).toBe('x');
    expect(notaDeQa({ mision: 't_ver', paso: 0, texto: '  ' }, desde)).toBeNull();
    expect(notaDeQa({ mision: '', paso: 0, texto: 'x' }, desde)).toBeNull();
    expect(notaDeQa({ mision: 't_ver', paso: -1, texto: 'x' }, desde)).toBeNull();
    expect(leer('./qaPagina.ts')).toContain('fetch(RUTA_NOTA_QA');
    expect(RUTA_NOTA_QA).toBe(`${RUTA_QA}/nota`);
    const api = leer('../servidor/api.ts');
    const nota = api.slice(api.indexOf("ruta === '/qa/nota'"), api.indexOf("ruta === '/qa/nota'") + 2200);
    expect(nota).toContain('esPeticionLocal(req.socket.remoteAddress)');
    expect(nota).toContain('(await listarIds()).includes(cuerpo.proyecto)');
    expect(nota).toContain('decidir(pid, nota,');
    expect(nota).toContain('transcribirLuego(pid, audios,');
    expect(nota).toContain('server.ws.send({ type: \'custom\', event: EVENTO_NOTA_QA, data: { proyecto: pid } });');
    expect(leer('./app.ts')).toContain('import.meta.hot?.on(EVENTO_NOTA_QA,');
  });

  it('nada de lo que trae rompe el guion', () => {
    const f = directorFlotante({ ...director, mision: 't</script><b>' });
    expect(f).not.toContain('t</script><b>');
  });

  it('la vista de dispositivo: tres iconos bajo «Volver a mi misión», que se pliegan con él (pd_qa_vista_dispositivo, nmwppz2zvtit)', () => {
    const f = directorFlotante(director);
    const cuerpo = f.slice(f.indexOf('<div class="qa-cuerpo">'), f.indexOf('</div></div>'));
    expect(cuerpo.indexOf('data-qa-volver')).toBeLessThan(cuerpo.indexOf('class="qa-disps"'));
    for (const d of ['escritorio', 'tableta', 'telefono']) expect(cuerpo).toContain(`data-qa-disp="${d}"`);
    expect(cuerpo).toContain('aria-label="Phone"');
    expect(cuerpo).toContain('role="group" aria-label="View as"');
    // Plegado, el cuerpo entero se esconde: los iconos con él
    expect(f).toContain('.qa-dir.plegado .qa-cuerpo,');
    // Ningún giro: solo derechos (nmwppwj1stit)
    expect(f).not.toMatch(/girar|rotate/);
  });

  it('la pantalla simulada: 390 × 844 y 820 × 1180, achicada solo si no cabe, nunca más grande (nmwppvslltit, nmwppw2qjtit)', () => {
    expect(TAMANOS_QA).toEqual({ escritorio: null, tableta: { ancho: 820, alto: 1180 }, telefono: { ancho: 390, alto: 844 } });
    const tel = TAMANOS_QA.telefono!;
    // En una ventana grande queda a su tamaño real
    expect(escalaQa(tel, { ancho: 2560, alto: 1440 })).toBe(1);
    // En una más baja, se achica hasta caber entera, con su contorno y su aire: nunca barra vertical
    const k = escalaQa(tel, { ancho: 1366, alto: 768 });
    expect(k).toBeLessThan(1);
    expect((tel.alto + 2 * BORDE_QA) * k).toBeLessThanOrEqual(768 - 2 * MARGEN_QA + 1e-9);
    expect((TAMANOS_QA.tableta!.alto + 2 * BORDE_QA) * escalaQa(TAMANOS_QA.tableta!, { ancho: 1920, alto: 1080 })).toBeLessThanOrEqual(1080 - 2 * MARGEN_QA + 1e-9);
    // El guion de la página hace la misma cuenta, dentro de un contorno dibujado y con la página sin barra
    const f = directorFlotante(director);
    expect(f).toContain('var k=innerWidth>=t.ancho+2*D.borde&&innerHeight>=t.alto+2*D.borde?1:Math.max(0.1,Math.min(1,(innerWidth-2*D.margen)/(t.ancho+2*D.borde),(innerHeight-2*D.margen)/(t.alto+2*D.borde)))');
    expect(f).toContain("addEventListener('resize',escalar)");
    expect(f).toContain(`iframe.qa-disp{left:50%;top:50%;right:auto;bottom:auto;box-sizing:content-box;border:${BORDE_QA}px solid`);
    expect(paginaQa({ puerta: APP, idioma: 'en', textos, rehusa: false, director })).toContain('html,body{margin:0;height:100%;overflow:hidden}');
  });

  it('al cambiar de dispositivo recarga la página en la dirección que mostraba, y si cabe va a su tamaño real (nmwpsf2getit)', () => {
    const f = directorFlotante(director);
    // Primero el tamaño, después la recarga: la página arranca ya en ese tamaño, sin perder el dispositivo recordado
    expect(f).toContain('g.dispositivo=d;guardar();ponerDisp(d);recargar()');
    // Del mismo origen, en su dirección actual; si no se puede leer, por su src; siempre con una marca nueva (nmwpu4fgxtit)
    // (y la página de otro origen, en la estación que el recorrido contó: nmwpv6866tit)
    expect(f).toContain("function recargar(){if(!marco)return;var m=Date.now().toString(36);try{var w=marco.contentWindow,h=w.location.href;if(h&&h!=='about:blank'){w.location.replace(recargaSinCache(h,m));return}}catch(e){}marco.src=recargaSinCache(conEstacion(marco.getAttribute('src')||'',estacion),m)}");
    // El mismo icono otra vez no recarga
    expect(f).toContain("if(d===raiz.getAttribute('data-qa-dispositivo'))return;");
    // Al abrir la pestaña no se recarga: ya arranca en su dispositivo
    expect(f).not.toMatch(/ponerDisp\(hayDisp[^;]*;recargar/);
    // Escala 1 si cabe con su contorno, aunque le falte el aire
    const tel = TAMANOS_QA.telefono!;
    expect(escalaQa(tel, { ancho: 1920, alto: tel.alto + 2 * BORDE_QA })).toBe(1);
    expect(escalaQa(tel, { ancho: 1920, alto: 900 })).toBe(1);
    expect(escalaQa(tel, { ancho: 1920, alto: tel.alto + 2 * BORDE_QA - 1 })).toBeLessThan(1);
  });

  it('recuerda el dispositivo por proyecto, un paso puede abrir ya en una vista, y la primera vez avisa su límite en una línea (nmwppx56ftit, nmwppzjq0tit, nmwpq11frtit)', () => {
    const f = directorFlotante(director);
    expect(f).toContain('g.dispositivo=d;guardar();ponerDisp(d)');
    expect(f).toContain("ponerDisp(primera?D.disp:hayDisp(g.dispositivo)?g.dispositivo:'escritorio')");
    expect(f).toContain('"disp":null');
    expect(directorFlotante({ ...director, dispositivo: 'telefono' })).toContain('"disp":"telefono"');
    // El aviso: una línea, escondida hasta el primer paso a tableta o teléfono en ese proyecto
    expect(f).toContain('<p class="qa-aviso-disp" data-qa-aviso role="status" hidden>Only the size</p>');
    expect(f).toContain("if(d!=='escritorio'&&!g.avisado&&aviso){g.avisado=true;");
    expect(f).toContain('white-space:nowrap');
    // El servidor lee el dispositivo del plan, del atajo o del botón a la página pública, nunca de la petición
    const api = leer('../servidor/api.ts');
    expect(api).toContain('const dispositivoDelPaso = p && typeof p !== \'string\' ? (p.atajo?.dispositivo ?? p.ir?.dispositivo) : undefined;');
    expect(api).toContain('...(esDispositivoQa(dispositivoDelPaso) ? { dispositivo: dispositivoDelPaso } : {}),');
  });

  it('el dispositivo de un paso vale solo la primera vez que su botón abre la pestaña: después gana la última elección (nmwpu178utit)', () => {
    // El guion de verdad, con un localStorage y una página falsos: así se ve qué dispositivo queda en cada carga
    const correr = (dispositivo: 'telefono' | undefined, guardado: Record<string, string>) => {
      const f = directorFlotante({ ...director, ...(dispositivo ? { dispositivo } : {}) });
      const guion = f.slice(f.lastIndexOf('<script>') + 8, f.lastIndexOf('</script>'));
      const atributos: Record<string, string> = {};
      const boton = (d?: string) => ({ getAttribute: (n: string) => (n === 'data-qa-disp' ? d : null), setAttribute() {}, addEventListener() {}, classList: { toggle() {}, contains: () => false }, style: {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 10, height: 10 }), querySelector: () => boton(), setPointerCapture() {} });
      const disps = ['escritorio', 'tableta', 'telefono'].map((d) => boton(d));
      const caja = { ...boton(), querySelector: () => boton(), querySelectorAll: () => disps };
      const document = { querySelector: (s: string) => (s === '[data-qa-director]' ? caja : null), documentElement: { setAttribute: (n: string, v: string) => (atributos[n] = v), getAttribute: (n: string) => atributos[n] } };
      const localStorage = { getItem: (k: string) => guardado[k] ?? null, setItem: (k: string, v: string) => (guardado[k] = v) };
      new Function('document', 'localStorage', 'addEventListener', 'innerWidth', 'innerHeight', guion)(document, localStorage, () => {}, 1920, 1080);
      return atributos['data-qa-dispositivo'];
    };
    const guardado: Record<string, string> = { [claveDirectorQa('app')]: JSON.stringify({ dispositivo: 'escritorio' }) };
    // La primera vez, el paso que pide teléfono abre en teléfono
    expect(correr('telefono', guardado)).toBe('telefono');
    // Al recargar o volver a abrirla desde el mismo paso, gana lo que la persona eligió por última vez
    expect(correr('telefono', guardado)).toBe('escritorio');
    // Sin dispositivo en el paso, siempre la última elección; sin ninguna, el escritorio
    expect(correr(undefined, guardado)).toBe('escritorio');
    expect(correr(undefined, {})).toBe('escritorio');
    expect(JSON.parse(guardado[claveDirectorQa('app')]!).pasos).toEqual({ 't_ver#1': 1 });
  });

  it('cada carga de la pestaña de QA se pide entera: una marca nueva antes del #, al abrirla y al recargar (nmwpu4fgxtit)', () => {
    expect(PARAM_SIN_CACHE).toBe('stl-qa');
    const tour = 'https://argwabot.github.io/STL-Sacred_Time_Line/#problemas';
    expect(marcaSinCache(tour, 'a1')).toBe('https://argwabot.github.io/STL-Sacred_Time_Line/?stl-qa=a1#problemas');
    // Una marca nueva reemplaza la anterior, sin tocar lo demás ni el #
    expect(marcaSinCache('http://localhost:8090/panel?x=1&stl-qa=a1#arriba', 'b2')).toBe('http://localhost:8090/panel?x=1&stl-qa=b2#arriba');
    expect(marcaSinCache('http://localhost:8090/', 'b2')).toBe('http://localhost:8090/?stl-qa=b2');
    // Por la puerta, la marca va también en la página a la que lleva, la que se muestra
    const puerta = `${APP}/__stl/puerta?rol=gerente&ir=${encodeURIComponent('/panel?stl-qa=a1#total')}&stl-qa=a1`;
    const otra = new URL(recargaSinCache(puerta, 'c3'));
    expect(otra.searchParams.get('ir')).toBe('/panel?stl-qa=c3#total');
    expect(otra.searchParams.get('stl-qa')).toBe('c3');
    expect(recargaSinCache(tour, 'c3')).toBe('https://argwabot.github.io/STL-Sacred_Time_Line/?stl-qa=c3#problemas');
    // Las dos funciones van tal cual dentro del guion de la página, sin nada de afuera
    const f = directorFlotante(director);
    expect(f).toContain('function marcaSinCache(');
    expect(f).toContain('function recargaSinCache(');
    const suelta = new Function(`${marcaSinCache.toString()}\n${recargaSinCache.toString()}\nreturn recargaSinCache;`)() as typeof recargaSinCache;
    expect(suelta(tour, 'd4')).toBe('https://argwabot.github.io/STL-Sacred_Time_Line/?stl-qa=d4#problemas');
    // La estación que contó el recorrido reemplaza la del paso; vacía, la portada; null o algo raro, sin cambio (nmwpv6866tit)
    expect(conEstacion(tour, '#e-como-empezar')).toBe('https://argwabot.github.io/STL-Sacred_Time_Line/#e-como-empezar');
    expect(conEstacion(tour, '')).toBe('https://argwabot.github.io/STL-Sacred_Time_Line/');
    expect(conEstacion(tour, null)).toBe(tour);
    expect(conEstacion(tour, '#"><script>')).toBe(tour);
    expect(f).toContain('function conEstacion(');
    expect(f).toContain("var estacion=null;addEventListener('message',function(e){if(!marco||e.source!==marco.contentWindow)return;var d=e.data;if(d&&d.tipo==='stl-estacion'&&typeof d.hash==='string'){estacion=d.hash;try{localStorage.setItem(D.claveEstacion,d.hash)}catch(x){}}});");
    // Cada cambio de dispositivo recarga con una marca nueva, y la página y su redirección nunca se guardan
    expect(f).toContain('g.dispositivo=d;guardar();ponerDisp(d);recargar()');
    expect(CABECERAS_QA['Cache-Control']).toContain('no-store');
    const api = leer('../servidor/api.ts');
    expect(api.match(/res\.writeHead\(200, CABECERAS_QA\)/g)?.length).toBe(2);
    expect(api).toContain("paginaQa({ puerta: marcaSinCache(recorrido, Date.now().toString(36))");
    expect(api).toContain("res.writeHead(302, { Location: direccionDeLaPuerta(atajo), 'Cache-Control': CABECERAS_QA['Cache-Control']");
  });

  it('reabrir el recorrido sin ancla vuelve a la última estación; un botón con ancla gana; y se recuerda tras «Volver a mi misión»', () => {
    const tour = 'https://argwabot.github.io/STL-Sacred_Time_Line/?stl-qa=a1';
    // (a) sin ancla, la última estación
    expect(conEstacionRecordada(tour, '#e-como-empezar')).toBe('https://argwabot.github.io/STL-Sacred_Time_Line/?stl-qa=a1#e-como-empezar');
    expect(conEstacionRecordada(`${tour}#`, '#e-como-empezar')).toBe(`${tour}#e-como-empezar`);
    // (b) con ancla (# o ?ver / ?abrir), esa y no la recordada
    expect(conEstacionRecordada(`${tour}#problemas`, '#e-como-empezar')).toBe(`${tour}#problemas`);
    expect(conEstacionRecordada(`${tour}&ver=3`, '#e-como-empezar')).toBe(`${tour}&ver=3`);
    expect(conEstacionRecordada(`${tour}&abrir=2`, '#e-como-empezar')).toBe(`${tour}&abrir=2`);
    // Nada recordado, algo raro, o la puerta de un proyecto: sin cambio
    expect(conEstacionRecordada(tour, null)).toBe(tour);
    expect(conEstacionRecordada(tour, '#"><script>')).toBe(tour);
    expect(conEstacionRecordada(`${APP}/__stl/puerta?ir=%2F`, '#x')).toBe(`${APP}/__stl/puerta?ir=%2F`);
    // (c) el guion de verdad, dos cargas seguidas (la ida y vuelta de «Volver a mi misión»): lo que el recorrido contó en
    // la primera carga queda guardado por proyecto y la segunda abre ahí; un botón con ancla gana
    const guardado: Record<string, string> = {};
    const cargar = (src: string, avisa?: string) => {
      const f = directorFlotante(director);
      const guion = f.slice(f.lastIndexOf('<script>') + 8, f.lastIndexOf('</script>'));
      const atributos: Record<string, string> = {};
      const boton = (d?: string) => ({ getAttribute: (n: string) => (n === 'data-qa-disp' ? d : null), setAttribute() {}, addEventListener() {}, classList: { toggle() {}, contains: () => false }, style: {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 10, height: 10 }), querySelector: () => boton(), setPointerCapture() {} });
      const disps = ['escritorio', 'tableta', 'telefono'].map((d) => boton(d));
      const caja = { ...boton(), querySelector: () => boton(), querySelectorAll: () => disps };
      const ventanaMarco = {};
      const marco = { ...boton(), src, contentWindow: ventanaMarco, getAttribute: (n: string) => (n === 'src' ? marco.src : null) };
      const document = { querySelector: (s: string) => (s === '[data-qa-director]' ? caja : s === '[data-qa-marco]' ? marco : null), documentElement: { setAttribute: (n: string, v: string) => (atributos[n] = v), getAttribute: (n: string) => atributos[n] } };
      const localStorage = { getItem: (k: string) => guardado[k] ?? null, setItem: (k: string, v: string) => (guardado[k] = v) };
      let oyente: (e: unknown) => void = () => {};
      new Function('document', 'localStorage', 'addEventListener', 'innerWidth', 'innerHeight', guion)(document, localStorage, (t: string, fn: (e: unknown) => void) => { if (t === 'message') oyente = fn; }, 1920, 1080);
      if (avisa !== undefined) oyente({ source: ventanaMarco, data: { tipo: 'stl-estacion', hash: avisa } });
      return marco.src;
    };
    const base = 'https://argwabot.github.io/STL-Sacred_Time_Line/';
    // Primera carga: nada recordado, abre como dice el paso; el recorrido cuenta su estación
    expect(cargar(`${base}?stl-qa=a1`, '#e-como-empezar')).toBe(`${base}?stl-qa=a1`);
    expect(guardado[claveEstacionQa('app')]).toBe('#e-como-empezar');
    // Otra carga de la pestaña (después de volver a la misión y oprimir el recorrido): sin ancla, abre ahí
    expect(cargar(`${base}?stl-qa=a2`)).toMatch(/^https:\/\/argwabot\.github\.io\/STL-Sacred_Time_Line\/\?stl-qa=(?!a2)[^#&]+#e-como-empezar$/);
    // Con una ancla del botón, esa gana
    expect(cargar(`${base}?stl-qa=a3#problemas`)).toBe(`${base}?stl-qa=a3#problemas`);
  });

  it('la fotonota toma la ventana entera y la nota dice en qué dispositivo se tomó (nmwppyi02tit)', () => {
    const desde = (p: string, d?: string) => (d ? `From the QA tab, in ${d} view, on ${p}` : `From the QA tab, on ${p}`);
    expect(notaDeQa({ mision: 't_ver', paso: 0, pagina: `${APP}/x`, dispositivo: 'telefono', audio: 'data:audio/webm;base64,AA' }, desde)?.texto).toBe(`From the QA tab, in telefono view, on ${APP}/x`);
    expect(notaDeQa({ mision: 't_ver', paso: 0, pagina: `${APP}/x`, dispositivo: 'escritorio', audio: 'data:audio/webm;base64,AA' }, desde)?.texto).toBe(`From the QA tab, on ${APP}/x`);
    expect(notaDeQa({ mision: 't_ver', paso: 0, pagina: `${APP}/x`, dispositivo: '<b>', audio: 'data:audio/webm;base64,AA' }, desde)?.texto).toBe(`From the QA tab, on ${APP}/x`);
    const pagina = leer('./qaPagina.ts');
    expect(pagina).toContain("document.documentElement.getAttribute('data-qa-dispositivo')");
    expect(pagina).toContain('pagina: donde, dispositivo,');
    expect(leer('../servidor/api.ts')).toContain("t('qa.notaDesdeDispositivo', { pagina, dispositivo: t(`qa.dispEnNota.${d}`), ancho: tam.ancho, alto: tam.alto })");
  });

  it('la página pública de STL abre en la pestaña de QA, en la estación del paso (nmwpc43ottit, nmwpkja4dtit)', () => {
    expect(esPaginaDelStudio('https://argwabot.github.io/STL-Sacred_Time_Line/#problemas')).toBe(true);
    expect(esPaginaDelStudio('https://example.com/#problemas')).toBe(false);
    const html = paginaQa({ puerta: 'https://argwabot.github.io/STL-Sacred_Time_Line/#problemas', idioma: 'en', textos, rehusa: false, director });
    expect(html).toContain('<iframe src="https://argwabot.github.io/STL-Sacred_Time_Line/#problemas"');
    const api = leer('../servidor/api.ts');
    expect(api).toContain("const recorrido = ruta === '/qa' && !atajo && p && typeof p !== 'string' && p.ir?.url && esPaginaDelStudio(p.ir.url) ? p.ir.url : null;");
  });

  it('el recorrido de STL lleva los mismos tres iconos que la aplicación de un proyecto: el mismo director flotante (nmwprs1e8tit)', () => {
    const recorrido = paginaQa({ puerta: 'https://argwabot.github.io/STL-Sacred_Time_Line/#problemas', idioma: 'en', textos, rehusa: false, director });
    const app = paginaQa({ puerta: `${APP}/stl-puerta?rol=x&ir=%2F`, idioma: 'en', textos, rehusa: false, director });
    for (const html of [recorrido, app]) {
      expect(html).toContain('class="qa-disps"');
      for (const d of ['escritorio', 'tableta', 'telefono']) expect(html).toContain(`data-qa-disp="${d}"`);
    }
    // Las dos rutas del servidor arman el mismo director (directorQa()), con o sin atajo
    const api = leer('../servidor/api.ts');
    expect(api.match(/director: directorQa\(\)/g)?.length).toBe(2);
  });

  it('la pestaña de QA sirve el código de ahora: el reinicio que el servidor retuvo nunca se suelta porque la página aún diga otro proyecto (nmwprs1e8tit)', () => {
    // La causa: al volver al Studio con el selector, el servidor pidió su reinicio en cuanto el Studio quedó activo, pero los
    // datos de la página aún decían el otro proyecto y la cuenta se soltaba en su sitio. El servidor esperó media hora
    // con el código de antes, y la pestaña de QA salió sin los iconos. Ahora la cuenta espera al Studio
    expect(arranqueDeLaCuenta({ esElStudio: false, ocupado: false })).toBe('esperar');
    expect(arranqueDeLaCuenta({ esElStudio: true, ocupado: false })).toBe('empezar');
    expect(arranqueDeLaCuenta({ esElStudio: true, ocupado: true })).toBe('esperar');
    // Solo «abriste el Studio otra vez» termina en su sitio con otro proyecto, como antes
    expect(arranqueDeLaCuenta({ esElStudio: false, abrir: true, ocupado: false })).toBe('en_su_sitio');
    const app = leer('./app.ts');
    const aviso = app.slice(app.indexOf("import.meta.hot?.on('estudio:recargar'"), app.indexOf('/** El director terminó:'));
    expect(aviso).not.toContain('return void cargar(true);');
  });
});
