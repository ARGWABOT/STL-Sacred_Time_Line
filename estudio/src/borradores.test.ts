// El diálogo único para hablarle al director (pedido pd_dialogo_unico): sus borradores, la tecla N y que todas las
// entradas pasen por el mismo diálogo.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { archivoDeAdjunto, borradoresDe, claveDeBorrador, guardarBorrador, leerBorrador, lineaDeBorrador, quitarBorrador, SOBRE_CORREGIR, type Almacen, type Borrador } from './borradores';

/** Un almacén como localStorage, con un tope para probar lo que no cabe. */
function almacen(tope = Infinity): Almacen & { datos: Map<string, string> } {
  const datos = new Map<string, string>();
  return {
    datos,
    get length() { return datos.size; },
    key: (i) => [...datos.keys()][i] ?? null,
    getItem: (k) => datos.get(k) ?? null,
    setItem: (k, v) => {
      if (v.length > tope) throw new Error('QuotaExceededError');
      datos.set(k, v);
    },
    removeItem: (k) => void datos.delete(k),
  };
}

const base = (x: Partial<Borrador> = {}): Borrador => ({ proyecto: 'golf', sobre: { tipo: 'mision', id: 't_a', seccion: 'Paso 1' }, titulo: 'Comentar el paso 1', texto: 'Algo que no envié', cuando: '2026-10-28T10:00:00.000Z', ...x });

describe('los borradores del diálogo único (pd_dialogo_unico)', () => {
  it('lo cerrado sin enviar vuelve sobre lo mismo, y no sobre otro lugar ni otro proyecto', () => {
    const a = almacen();
    expect(guardarBorrador(a, base({ tipoNota: 'ajuste' }))).toBe('guardado');
    // el mismo lugar, aunque sus campos lleguen en otro orden
    expect(leerBorrador(a, 'golf', { seccion: 'Paso 1', id: 't_a', tipo: 'mision' })).toMatchObject({ texto: 'Algo que no envié', tipoNota: 'ajuste' });
    expect(leerBorrador(a, 'golf', { tipo: 'mision', id: 't_a', seccion: 'Paso 2' })).toBeNull();
    expect(leerBorrador(a, 'otro', { tipo: 'mision', id: 't_a', seccion: 'Paso 1' })).toBeNull();
    expect(claveDeBorrador('golf', { tipo: 'general' })).not.toBe(claveDeBorrador('golf', { tipo: 'general', seccion: 'Dónde quedamos › avanzamos' }));
  });

  it('dura hasta que se envía o se borra; vacío no es un borrador', () => {
    const a = almacen();
    guardarBorrador(a, base());
    expect(guardarBorrador(a, base({ texto: '   ' }))).toBe('vacio');
    expect(leerBorrador(a, 'golf', base().sobre)).toBeNull();
    guardarBorrador(a, base({ texto: '', audio: 'data:audio/webm;base64,AAAA', segundos: 12 }));
    expect(leerBorrador(a, 'golf', base().sobre)).toMatchObject({ audio: 'data:audio/webm;base64,AAAA', segundos: 12 });
    quitarBorrador(a, 'golf', base().sobre);
    expect(leerBorrador(a, 'golf', base().sobre)).toBeNull();
  });

  it('si el audio no cabe en el navegador, queda lo escrito y se dice; sin nada escrito, no se guarda', () => {
    const a = almacen(400);
    const largo = `data:audio/webm;base64,${'A'.repeat(1000)}`;
    expect(guardarBorrador(a, base({ audio: largo }))).toBe('sin_audio');
    expect(leerBorrador(a, 'golf', base().sobre)?.audio).toBeUndefined();
    expect(guardarBorrador(a, base({ texto: '', audio: largo }))).toBe('no');
  });

  it('antes de pedir la revisión, los de este proyecto, del más viejo al más nuevo, cada uno en una línea', () => {
    const a = almacen();
    guardarBorrador(a, base({ cuando: '2026-10-28T12:00:00.000Z' }));
    guardarBorrador(a, base({ sobre: { tipo: 'general' }, titulo: 'Un comentario para el director', texto: '', audio: 'data:audio/webm;base64,AAAA', cuando: '2026-10-28T09:00:00.000Z' }));
    guardarBorrador(a, base({ proyecto: 'otro' }));
    a.setItem('otra-cosa', 'x');
    const lista = borradoresDe(a, 'golf');
    expect(lista.map((b) => b.titulo)).toEqual(['Un comentario para el director', 'Comentar el paso 1']);
    expect(lista.map(lineaDeBorrador)).toEqual(['Un comentario para el director: un audio', 'Comentar el paso 1: «Algo que no envié»']);
  });
});

// La interfaz quedó en «Guardando…» sin salida mientras se transcribía una corrección grabada con la revisión de otro
// proyecto corriendo; al recargar se perdieron lo grabado y la imagen (nota de voz del titular nmwdku7f2tit)
describe('un guardado lento nunca atrapa ni pierde lo grabado y lo adjunto (nmwdku7f2tit)', () => {
  const director = (readFileSync(join(__dirname, 'app.ts'), 'utf-8') + readFileSync(join(__dirname, 'dialogoNota.ts'), 'utf-8')).replace(/\r\n/g, '\n');
  const tramo = (desde: string, hasta: string) => director.slice(director.indexOf(desde), director.indexOf(hasta, director.indexOf(desde) + desde.length));
  const imagen = { nombre: 'captura.png', datos: `data:image/png;base64,${Buffer.from('png de prueba').toString('base64')}` };

  it('el borrador guarda las demás áreas de texto y lo adjunto, y lo adjunto vuelve como archivo', () => {
    const a = almacen();
    const sobre = { tipo: SOBRE_CORREGIR, id: 'nmx' };
    expect(guardarBorrador(a, base({ sobre, texto: '', campos: { dicho: 'Lo que se entendió', despues: '' }, audio: 'data:audio/webm;base64,AAAA', adjuntos: [imagen] }))).toBe('guardado');
    const b = leerBorrador(a, 'golf', sobre)!;
    expect(b.campos).toEqual({ dicho: 'Lo que se entendió', despues: '' });
    expect(b.adjuntos).toEqual([imagen]);
    const f = archivoDeAdjunto(b.adjuntos![0])!;
    expect(f.name).toBe('captura.png');
    expect(f.type).toBe('image/png');
    expect(f.size).toBe('png de prueba'.length);
    // Solo lo adjunto, sin escribir ni grabar nada, ya es un borrador
    expect(guardarBorrador(a, base({ texto: '', adjuntos: [imagen] }))).toBe('guardado');
  });

  it('si no cabe, suelta primero lo adjunto, después el audio, y lo dice', () => {
    const conTodo = base({ audio: `data:audio/webm;base64,${'A'.repeat(400)}`, adjuntos: [{ nombre: 'grande.png', datos: `data:image/png;base64,${'B'.repeat(800)}` }] });
    const sinAdjuntos = JSON.stringify({ ...conTodo, adjuntos: undefined }).length;
    expect(guardarBorrador(almacen(sinAdjuntos + 10), conTodo)).toBe('sin_adjuntos');
    expect(guardarBorrador(almacen(300), conTodo)).toBe('sin_audio');
  });

  it('los borradores de «Corregir» se reabren desde su nota, no desde la lista de antes de pedir la revisión', () => {
    const a = almacen();
    guardarBorrador(a, base());
    guardarBorrador(a, base({ sobre: { tipo: SOBRE_CORREGIR, id: 'nmx' }, titulo: 'Corregir la nota' }));
    expect(borradoresDe(a, 'golf').map((b) => b.titulo)).toEqual(['Comentar el paso 1']);
  });

  it('mientras guarda, con borrador, «Dejar de esperar» siempre cierra, y lo de antes de esperar ya quedó guardado', () => {
    const pedir = tramo('function pedir(', '\n}\n');
    // Cancelar no se deshabilita mientras guarda si hay borrador: deja de esperar, aborta lo que sigue y deja el borrador
    expect(pedir).toContain(".botones button:not([data-cancelar])");
    expect(pedir).toContain("tx('dialogo.dejarDeEsperar')");
    const cancelar = tramo("cancelar.addEventListener('click'", '});');
    expect(cancelar).toContain('abandono.abort()');
    expect(cancelar).toContain('terminar(null)');
    // Antes de esperar al servidor, el borrador con lo grabado y lo adjunto; y lo que sigue del guardado se corta
    const envio = tramo('if (!o.guardar) return terminar(resultado);', 'if (guardado) return terminar(resultado);');
    expect(envio.indexOf('guardarBorrador(localStorage')).toBeLessThan(envio.indexOf('marcarGuardando(true)'));
    expect(envio).toContain('...(archivos ? { adjuntos: archivos } : {})');
    expect(envio).toContain('o.guardar!(r, abandono.signal)');
    expect(envio).toContain('if (abandono.signal.aborted) return;');
    // Lo adjunto del borrador vuelve al abrir
    expect(pedir).toContain('(previo?.adjuntos ?? []).flatMap((a) => archivoDeAdjunto(a) ?? [])');
  });

  it('«Corregir» una nota lleva su borrador y no guarda nada si se canceló la transcripción', () => {
    const corregir = tramo('} else if (ds.editarNota) {', '} else if (ds.decidir) {');
    expect(corregir).toContain('borrador: { proyecto: d.activo, sobre: { tipo: SOBRE_CORREGIR, id: n.id }, soloAlGuardar: true }');
    expect(corregir).toContain('if (sumado === null || senal.aborted) return false;');
  });

  it('en «Corregir», «Dejar de esperar» solo cierra la ventana: el guardado sigue por detrás, contado, y llega a su nota en su proyecto (nmwehuc6jtit)', () => {
    const corregir = tramo('} else if (ds.editarNota) {', '} else if (ds.decidir) {');
    // La corrección pide seguir por detrás, y su guardado entero va dentro de NotasEnCurso, en el proyecto de la nota
    expect(corregir).toContain('enFondo: true,');
    expect(corregir).toContain('guardar: (r, senal) => notasEnCurso.durante(deEste, async () => {');
    // Si el proyecto activo ya es otro al guardar, no se guarda en él: queda el borrador del suyo
    const guardar = corregir.slice(corregir.indexOf('guardar: (r, senal)'));
    expect(guardar.indexOf('if (d.activo !== deEste) return false;')).toBeGreaterThan(guardar.indexOf('repartirDictado('));
    expect(guardar.indexOf('if (d.activo !== deEste) return false;')).toBeLessThan(guardar.indexOf("await accion({ tipo: 'editar_nota'"));
    // Con enFondo, «Dejar de esperar» no aborta: marca que sigue, cierra sin escribir otro borrador y lo dice
    const cancelar = tramo("cancelar.addEventListener('click'", '\n    });');
    const fondo = cancelar.slice(cancelar.indexOf('if (o.enFondo) {'), cancelar.indexOf('abandono.abort()'));
    expect(fondo).toContain('enFondo = true;');
    expect(fondo).toContain('terminar(null);');
    expect(fondo).toContain("avisar(tx('dialogo.sigueEnFondo'), true)");
    expect(fondo).not.toContain('abandono.abort()');
    const pedir = tramo('function pedir(', '\n}\n');
    expect(pedir).toContain('const escrito = o.borrador && !resultado && !borrado && !enFondo &&');
    // Al terminar por detrás: guardado, su borrador se va; si no, el borrador queda y se dice
    const envio = tramo('if (abandono.signal.aborted) return;', 'marcarGuardando(false);');
    expect(envio).toContain("if (!guardado) return avisar(tx('dialogo.fondoNoGuardo'));");
    expect(envio).toContain('if (o.borrador) quitarBorrador(localStorage, o.borrador.proyecto, o.borrador.sobre);');
  });
});

describe('todas las entradas abren el mismo diálogo (pd_dialogo_unico)', () => {
  const director = (readFileSync(join(__dirname, 'app.ts'), 'utf-8') + readFileSync(join(__dirname, 'dialogoNota.ts'), 'utf-8')).replace(/\r\n/g, '\n');
  const tramo = (desde: string, hasta: string) => director.slice(director.indexOf(desde), director.indexOf(hasta, director.indexOf(desde) + desde.length));

  it('el comentario general y el ✉ de cada lugar pasan por comentar, que guarda su borrador', () => {
    expect(tramo('async function escribirAlDirector(', '\n}\n')).toContain("await comentar({ tipo: 'general' }");
    expect(tramo('async function comentar(', '\n}\n')).toContain('borrador: { proyecto: d.activo, sobre }');
    // pedir lo trae de vuelta, lo dice, y al cerrar sin enviar lo guarda; enviado o borrado, se quita
    const pedir = tramo('function pedir(', '\n}\n');
    expect(pedir).toContain('leerBorrador(localStorage');
    expect(pedir).toContain("tx('dialogo.borrador')");
    expect(pedir).toContain('guardarAlCerrar(');
    expect(pedir).toMatch(/if \(o\.borrador && \(resultado \|\| borrado\)\) quitarBorrador\(/);
  });

  it('la N lo abre sobre lo que miras, nunca mientras se escribe en un campo o hay otro diálogo abierto', () => {
    const n = tramo("document.addEventListener('keydown', (e) => {\n  if (e.key.toLowerCase() !== 'n'", '\n});\n');
    expect(n).toContain('e.ctrlKey || e.metaKey || e.altKey');
    expect(n).toMatch(/TEXTAREA\|SELECT/);
    // Y lo cierra si es el de una nota, como un interruptor (nota nmvsxhzqvtit): elegir el tipo no es escribir
    expect(n).toContain('form[data-nota] [data-cancelar]');
    expect(n).toContain('radio|checkbox');
    expect(n).toContain("document.querySelector('dialog[open]')");
    expect(n).toContain('sobreLoQueMiras()');
    expect(n).toContain('escribirAlDirector()');
  });

  it('desde un lugar, la nota va marcada como comentario y se cambia de un toque; también la de una opción que promete contar más (notas nmvsx5o4htit y nmvsxgf6ttit)', () => {
    expect(tramo('async function comentar(', '\n}\n')).toContain("campoTipo(tipoInicial ?? (general ? undefined : 'respuesta'))");
    const elegir = tramo('async function elegirEnPaso(', '\n}\n');
    expect(elegir).toContain("campos: [campoTipo('respuesta')");
    expect(elegir).toContain('tipoNota: r.tipoNota');
  });

  it('una pregunta es el comentario general con su tipo «Pregunta», sin urgencia; ni el diálogo viejo ni el atajo aparte (pd_preguntas_buzon, nota nmvt2rup6tit)', () => {
    // Un solo canal: «Hacer una pregunta» abre el comentario general, con «Pregunta» ya marcado
    expect(director).toContain("await comentar({ tipo: 'general' }, tx('buzon.unComentario'), 'pregunta');");
    expect(director).not.toContain("comentar({ tipo: 'pregunta' }");
    const comentar = tramo('async function comentar(', '\n}\n');
    expect(comentar).toContain("const comoPregunta = (dicho: Dicho) => general && dicho.tipoNota === 'pregunta';");
    expect(comentar).toContain("dejarNota(comoPregunta(dicho) ? { tipo: 'pregunta' } : sobre, dicho.texto, dicho.audio, !!dicho.urgente && !comoPregunta(dicho),");
    expect(comentar).toContain('campoTipo(tipoInicial ?? (general ? undefined : \'respuesta\'))');
    // Junto a la cara del director ya no hay un «?» aparte: solo «Comentario»
    const atajos = readFileSync(join(__dirname, '../../index.html'), 'utf-8').match(/<div class="atajos-director"[\s\S]*?<\/div>/)?.[0] ?? '';
    expect(atajos).toContain('data-escribir');
    expect(atajos).not.toContain('data-preguntas');
    expect(director).not.toMatch(/abrirPreguntas|formularPreguntas|from '\.\/preguntas'/);
    expect(existsSync(join(__dirname, 'preguntas.ts'))).toBe(false);
  });

  it('pedir la revisión con borradores sin enviar los muestra antes', () => {
    const pedirRevision = tramo('async function pedirLaRevision(', '\n}\n');
    expect(pedirRevision.indexOf('antesDeLosBorradores()')).toBeGreaterThan(0);
    expect(pedirRevision.indexOf('antesDeLosBorradores()')).toBeLessThan(pedirRevision.indexOf("fetch('/__estudio/director/revision'"));
  });
});
