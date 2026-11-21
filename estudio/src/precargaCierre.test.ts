import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { conPestanasAbiertas } from './guiaLectura.ts';
import { alEntrarEnProyecto, BLOQUES_DE_LA_MISION, cierresPorPrecargar, claveDelCierre, directorEnMarcha, dondeQuedamosSeAbre, enfoqueAlLlegar, esperarConTope, marcaConDatos, precargaDeUrgencia, PRECARGADAS_MAX, queEspera, recargaAlVolver, recordarPrecargadas, TOPE_PRECARGA_MS } from './precargaCierre.ts';

describe('al entrar en un proyecto con su revisión en marcha, nada se abre solo (nmwn0bbdgtit, nmwn17nrutit)', () => {
  it('lanzada o en curso y sin terminar: ni «¿Dónde quedamos?» ni el modo enfoque; se ve la revisión', () => {
    expect(alEntrarEnProyecto({ lanzada: '2026-11-19T04:00:00Z' })).toEqual({ dondeQuedamos: false, enfoque: false, verRevision: true });
    expect(alEntrarEnProyecto({ lanzada: '2026-11-19T04:00:00Z', enCurso: '2026-11-19T04:01:00Z' })).toEqual({ dondeQuedamos: false, enfoque: false, verRevision: true });
  });
  it('terminada, fallida, solo pedida o sin revisión: lo de siempre se abre', () => {
    const siempre = { dondeQuedamos: true, enfoque: true, verRevision: false };
    expect(alEntrarEnProyecto({ lanzada: 'a', enCurso: 'b', hecha: '2026-11-19T05:00:00Z' })).toEqual(siempre);
    expect(alEntrarEnProyecto({ lanzada: 'a', error: 'se detuvo' })).toEqual(siempre);
    expect(alEntrarEnProyecto({})).toEqual(siempre);
    expect(alEntrarEnProyecto(null)).toEqual(siempre);
  });
  it('el cambio de proyecto y el arranque lo consultan, y el cierre de la revisión sigue abriendo lo de siempre', () => {
    const app = readFileSync(join(__dirname, 'app.ts'), 'utf8');
    const activar = app.slice(app.indexOf('async function activar('), app.indexOf('// ───', app.indexOf('async function activar(')));
    expect(activar).toContain('alEntrarEnProyecto(d?.revision, d)');
    expect(activar.indexOf('if (!alEntrar.dondeQuedamos)')).toBeLessThan(activar.indexOf('await mostrarDondeQuedamos()'));
    expect(activar).toContain('quererEnfoque(false)');
    expect(app).toMatch(/tocaResumen: tocaResumen\(\) && alEntrarEnProyecto\(d\.revision, d\)\.dondeQuedamos/);
    const alTerminar = app.slice(app.indexOf('async function terminarEnSuSitio('), app.indexOf('let preparandoCierre'));
    expect(alTerminar).toContain('abrirAlCargar({ termino: true');
    expect(alTerminar).not.toContain('alEntrarEnProyecto');
  });
});

describe('la guardia única de lo que se abre solo, en cada camino de entrada (nmwpyo5wdtit)', () => {
  const app = readFileSync(join(__dirname, 'app.ts'), 'utf8');
  const activar = app.slice(app.indexOf('async function activar('), app.indexOf('// ───', app.indexOf('async function activar(')));

  it('una urgencia o una aclaración lanzadas cuentan como el director trabajando, igual que la revisión', () => {
    const cerrado = { dondeQuedamos: false, enfoque: false, verRevision: true };
    expect(alEntrarEnProyecto(null, { urgencia: { lanzada: 'a' } })).toEqual(cerrado);
    expect(alEntrarEnProyecto({ lanzada: 'a', hecha: 'b' }, { aclaracion: { lanzada: 'c' } })).toEqual(cerrado);
    expect(alEntrarEnProyecto(null, { urgencia: { lanzada: 'a', hecha: 'b' }, aclaracion: { lanzada: 'c', error: 'x' } }).dondeQuedamos).toBe(true);
    expect(directorEnMarcha({ lanzada: 'a' })).toBe(true);
    expect(directorEnMarcha({ lanzada: 'a', hecha: 'b' }, {})).toBe(false);
  });

  it('el modo enfoque que se traía de otro proyecto no sigue al entrar en uno donde el director trabaja', () => {
    expect(enfoqueAlLlegar({ querido: true, entra: true, trabaja: true })).toBe(false);
    // Entrar sin el director trabajando, o quedarse en el mismo proyecto: lo de la persona sigue como estaba
    expect(enfoqueAlLlegar({ querido: true, entra: true, trabaja: false })).toBe(true);
    expect(enfoqueAlLlegar({ querido: true, entra: false, trabaja: true })).toBe(true);
    expect(enfoqueAlLlegar({ querido: false, entra: true, trabaja: true })).toBe(false);
  });

  it('«¿Dónde quedamos?» abierto por el Studio espera al director; con un botón de la persona, se abre', () => {
    expect(dondeQuedamosSeAbre({ porLaPersona: false, revision: { lanzada: 'a' } })).toBe(false);
    expect(dondeQuedamosSeAbre({ porLaPersona: false, revision: null, otros: { urgencia: { lanzada: 'a' } } })).toBe(false);
    expect(dondeQuedamosSeAbre({ porLaPersona: true, revision: { lanzada: 'a' } })).toBe(true);
    expect(dondeQuedamosSeAbre({ porLaPersona: false, revision: { lanzada: 'a', hecha: 'b' } })).toBe(true);
  });

  it('los datos que llegan deciden el enfoque antes de pintar, en cualquier entrada (cambio, recarga, volver)', () => {
    const cargar = app.slice(app.indexOf('async function cargar('), app.indexOf('// Otro proyecto: lo abierto del anterior no sirve'));
    expect(cargar).toContain("enfoqueAlLlegar({ querido: enfoqueQuerido || !!enfoque, entra: !d || d.activo !== nuevo.activo, trabaja: directorTrabaja(nuevo) })");
    expect(cargar).toContain('enfoqueQuerido = false;');
  });

  it('el cambio de proyecto decide antes de la recarga retenida y del destino, que antes lo saltaban', () => {
    const guardia = activar.indexOf('if (!alEntrar.enfoque && (enfoqueQuerido || enfoque)) quererEnfoque(false);');
    expect(guardia).toBeGreaterThan(-1);
    expect(guardia).toBeLessThan(activar.indexOf('if (destino) return void (await ir(destino));'));
    expect(guardia).toBeLessThan(activar.indexOf('d?.recargaRetenida) return;'));
    expect(activar.indexOf('if (!alEntrar.dondeQuedamos)')).toBeLessThan(activar.indexOf('d?.recargaRetenida) return;'));
  });

  it('«¿Dónde quedamos?» pasa por la guardia, y solo los botones de la persona la saltan', () => {
    const dq = app.slice(app.indexOf('async function mostrarDondeQuedamos('), app.indexOf('const { html, est, mia, porDecidir } = htmlDondeQuedamos();'));
    expect(dq).toContain('if (!dondeQuedamosSeAbre({ porLaPersona, revision: d.revision, otros: d })) return;');
    expect(app).toContain("if ((e.target as HTMLElement).closest('[data-donde-quedamos]')) return void mostrarDondeQuedamos(true);");
    expect(app).toContain('if (cambiar.dataset.cambiar === d?.activo) return void (await mostrarDondeQuedamos(true));');
    // Lo que el Studio abre solo no dice que lo pidió la persona
    expect(activar).toContain('await mostrarDondeQuedamos();');
  });

  it('el modo enfoque por la dirección (?enfoque) es solo del director que mira sin pantalla', () => {
    expect(app).toContain("if (pedido.has('mirar') && pedido.has('enfoque')) ponerEnfoque(true);");
  });
});

describe('la precarga escondida dentro de la revisión (pd_precarga_oculta)', () => {
  it('en otro proyecto espera la voz y la niebla que tengas puestas; el Studio y una urgencia no esperan nada', () => {
    expect(queEspera({ esElStudio: false, urgencia: false, voz: true, niebla: true })).toEqual({ voz: true, niebla: true });
    // Con la voz apagada, no la espera; solo la niebla, si está (nmwi6rgsgtit)
    expect(queEspera({ esElStudio: false, urgencia: false, voz: false, niebla: true })).toEqual({ voz: false, niebla: true });
    expect(queEspera({ esElStudio: false, urgencia: false, voz: false, niebla: false })).toEqual({ voz: false, niebla: false });
    // El Studio se recarga y prepara antes; una urgencia se anuncia en cuanto cierra (nmwj6hsultit)
    expect(queEspera({ esElStudio: true, urgencia: false, voz: true, niebla: true })).toEqual({ voz: false, niebla: false });
    expect(queEspera({ esElStudio: false, urgencia: true, voz: true, niebla: true })).toEqual({ voz: false, niebla: false });
  });

  it('se anuncia en cuanto todo está listo, y nunca después de 90 segundos (nmwdpeslgtit, nmwgj3ah9tit)', async () => {
    expect(TOPE_PRECARGA_MS).toBe(90_000);
    let soltar: () => void = () => {};
    const reloj = () => new Promise<void>((listo) => { soltar = listo; });
    // Todo listo antes del tope
    expect(await esperarConTope([Promise.resolve(1), Promise.resolve(2)], 90_000, reloj)).toBe('listo');
    // Una voz que no termina: al tope se anuncia igual, y ella sigue en segundo plano
    const nunca = new Promise(() => {});
    const r = esperarConTope([nunca], 90_000, reloj);
    soltar();
    expect(await r).toBe('tope');
    // Una que falla no deja el anuncio esperando
    expect(await esperarConTope([Promise.reject(new Error('sin voz'))], 90_000, reloj)).toBe('listo');
    expect(await esperarConTope([], 90_000, reloj)).toBe('listo');
  });

  it('prepara el título y el primer paso de tu primera misión (nmwjk0f8rtit)', () => {
    expect(BLOQUES_DE_LA_MISION).toBe(2);
  });

  it('la página espera antes de anunciar, con su línea en «Lo que va haciendo el director», solo al terminar en su sitio', () => {
    const app = readFileSync(join(__dirname, 'app.ts'), 'utf8');
    const terminar = app.match(/async function terminarEnSuSitio\(\) \{[\s\S]*?\n\}\n/)?.[0] ?? '';
    // Primero la espera, después el aviso
    expect(terminar.indexOf('esperarConTope(')).toBeGreaterThan(-1);
    expect(terminar.indexOf('await lista;')).toBeGreaterThan(terminar.indexOf('esperarConTope('));
    expect(terminar.indexOf('await lista;')).toBeLessThan(terminar.indexOf('avisarTermino()'));
    expect(terminar).toContain('queEspera(');
    expect(terminar).toContain('prepararYEsperar(');
    expect(terminar).toContain('prepararNiebla(');
    // La ventana sigue abierta mientras espera, con su última línea
    expect(app).toContain("pintarProgreso(r.estado === 'en_curso' || urgente || preparandoCierre)");
    expect(app).toContain("tx('chat.preparandoCierre')");
    // Lo urgente se anuncia por su lado, sin pasar por esta espera
    const urgencia = app.match(/else if \(urgenciaLista\)[^\n]*/)?.[0] ?? '';
    expect(urgencia).not.toContain('esperarConTope');
    for (const f of ['es.ts', 'en.ts']) expect(readFileSync(join(__dirname, 'textos', f), 'utf8')).toContain("'chat.preparandoCierre'");
  });
});

describe('tras una urgencia, la misma precarga, en segundo plano (nota nmwk9qughtit)', () => {
  const app = readFileSync(join(__dirname, 'app.ts'), 'utf8').replace(/\r\n/g, '\n');

  it('prepara la voz y la niebla que tengas puestas, también en el Studio, sin que su aviso las espere (nmwj6hsultit)', () => {
    expect(precargaDeUrgencia({ voz: true, niebla: true })).toEqual({ voz: true, niebla: true, esperaElAviso: false });
    expect(precargaDeUrgencia({ voz: false, niebla: true })).toEqual({ voz: false, niebla: true, esperaElAviso: false });
    expect(precargaDeUrgencia({ voz: false, niebla: false })).toEqual({ voz: false, niebla: false, esperaElAviso: false });
  });

  it('la página la empieza al saber que la urgencia terminó, después de su aviso y sin esperarla', () => {
    const datos = app.slice(app.indexOf('const urgenciaLista = '), app.indexOf('async function terminarEnSuSitio()'));
    const aviso = datos.indexOf("else if (urgenciaLista) avisar(tx('aviso.urgenciaAtendida')");
    const precarga = datos.indexOf('if (urgenciaLista && !urgenciaFallo) void precargarTrasUrgencia();');
    expect(aviso).toBeGreaterThan(-1);
    expect(precarga).toBeGreaterThan(aviso);
    // Sin await: el aviso nunca la espera
    expect(datos).not.toContain('await precargarTrasUrgencia');
    const f = app.match(/async function precargarTrasUrgencia\(\) \{[\s\S]*?\n\}\n/)?.[0] ?? '';
    expect(f).toContain('precargaDeUrgencia({ voz: vozPuesta(), niebla: nieblaPuesta() })');
    expect(f).toContain('prepararYEsperar([{ caja: cajaDondeQuedamos() }');
    expect(f).toContain('cuantos: BLOQUES_DE_LA_MISION');
    expect(f).toContain('prepararNiebla()');
    // Nada de la espera de una revisión: ni la línea «Preparando…», ni el anuncio de que terminó
    expect(f).not.toMatch(/preparandoCierre|avisarTermino/);
  });
});

describe('toda revisión o urgencia que cierra, en cualquier proyecto, deja lista la precarga (nota nmwkx0ajmtit)', () => {
  const app = readFileSync(join(__dirname, 'app.ts'), 'utf8').replace(/\r\n/g, '\n');
  const funcion = (nombre: string) => app.slice(app.indexOf(`async function ${nombre}() {`), app.indexOf('\n}\n', app.indexOf(`async function ${nombre}() {`)));

  it('un cierre que nadie preparó se prepara al saber de él: también el de un proyecto que no es el Studio', () => {
    // La revisión de «app» cerró mientras la página no la vio terminar: se prepara una vez
    expect(cierresPorPrecargar({ proyecto: 'app', revision: { pedida: 'r1', hecha: 'h' }, precargadas: [] })).toEqual(['app:r1']);
    expect(cierresPorPrecargar({ proyecto: 'app', revision: { pedida: 'r1', hecha: 'h' }, precargadas: ['app:r1'] })).toEqual([]);
    // La urgencia también, y cada proyecto por su lado
    expect(cierresPorPrecargar({ proyecto: 'stl-studio', revision: { pedida: 'r1', hecha: 'h' }, urgencia: { pedida: 'u1', hecha: 'h' }, precargadas: ['app:r1'] })).toEqual(['stl-studio:r1', 'stl-studio:u1']);
    // Lo que sigue en marcha, no
    expect(cierresPorPrecargar({ proyecto: 'app', revision: { pedida: 'r2' }, urgencia: null, precargadas: [] })).toEqual([]);
    // Se recuerdan los últimos, sin repetir
    expect(recordarPrecargadas(['a', 'b'], ['b', 'c'])).toEqual(['a', 'b', 'c']);
    expect(recordarPrecargadas(Array.from({ length: PRECARGADAS_MAX }, (_, i) => String(i)), ['x'])).toHaveLength(PRECARGADAS_MAX);
  });

  it('la página la empieza al llegar los datos de cualquier proyecto, en segundo plano, y lo que ya preparó lo anota', () => {
    const datos = app.slice(app.indexOf('const urgenciaLista = '), app.indexOf('async function terminarEnSuSitio()'));
    expect(datos).toContain('else if (!enSuSitio) void precargarCierresPendientes();');
    expect(datos).not.toContain('await precargarCierresPendientes');
    const pendientes = funcion('precargarCierresPendientes');
    expect(pendientes).toContain('if (!anotarCierres().length) return;');
    expect(pendientes).toContain('return precargarTrasUrgencia();');
    // Sin mirar si es el Studio: vale para todo proyecto
    expect(pendientes).not.toContain('esElStudio');
    expect(funcion('terminarEnSuSitio')).toContain('anotarCierres();');
    expect(funcion('precargarTrasUrgencia')).toContain('anotarCierres();');
    // La de otro proyecto que cierra mientras estás en este: su «¿Dónde quedamos?» y lo primero de tu misión allí
    expect(app).toContain('void prepararDondeQuedamosDe(otraCerrada.proyecto).catch(() => {});');
  });
});

describe('al cerrar, todo lo que vas a oír entra a la cola en ese momento (nota nmwlak8zbtit)', () => {
  const app = readFileSync(join(__dirname, 'app.ts'), 'utf8').replace(/\r\n/g, '\n');
  const funcion = (firma: string) => app.slice(app.indexOf(firma), app.indexOf('\n}\n', app.indexOf(firma)));

  it('cubre «¿Dónde quedamos?» con todas sus pestañas (también las respuestas a tus notas), cada paso de cada misión y los documentos que te piden leer', () => {
    const todo = funcion('function precargarTodoAlCerrar() {');
    expect(todo).toContain('prepararLoQueSigue(cajaDondeQuedamos());');
    const sigue = funcion('function prepararLoQueSigue(');
    // Las pestañas de «¿Dónde quedamos?», delante
    expect(sigue).toContain('if (dlg) prepararDelante(dlg);');
    // Cada misión tuya, la de ahora y las que siguen, con cada paso que aún no se ve
    expect(sigue).toContain('misionesQueSiguen(reservaDeMisiones(d.plan, d.estado, yo), ahora?.id)');
    expect(sigue).toContain('prepararDeAntemano([tarjetaMision(m, false, 1), ...pasosPorVenir(m)]');
    // Y los documentos que esas misiones piden leer
    expect(sigue).toContain('partesPorLeer(misiones.flatMap(documentosDeMision), partesPedidas, true)');
  });

  it('«¿Dónde quedamos?» se prepara con TODAS sus pestañas abiertas (resumen, hoja de ruta y cada tipo de aviso), con el mismo texto con que la guía de lectura pide su audio', () => {
    // «¿Dónde quedamos?» como lo pinta lecturaDq: un panel por pestaña, y solo el de ahora a la vista; los demás, con `hidden`
    const panel = (p: string, abierto: boolean, lineas: string[]) =>
      `<div class="dq-panel" role="tabpanel" data-pestana="${p}"${abierto ? '' : ' hidden'}><section class="dq-seccion" data-seccion="${p}"><h3>${p}</h3><ul class="dq-lista">${lineas.map((t) => `<li><button type="button" class="dq-item"><span class="dq-texto">${t}</span></button></li>`).join('')}</ul></section></div>`;
    const caja = `<dialog class="dialogo-director donde-quedamos"><form method="dialog"><p class="dq-quedamos">El resumen.</p>${[
      panel('ruta', true, ['Lo que avanzamos esta vez.']),
      panel('preguntas', false, ['La respuesta a tu pregunta.']),
      panel('ajustes', false, ['El ajuste que pediste quedó así.']),
      panel('fallas', false, ['La falla que avisaste se corrigió.']),
      panel('ideas', false, ['La idea que dejaste, con su hoja de ruta.']),
    ].join('')}<p class="dq-al-dia" hidden>Todo al día.</p></form></dialog>`;
    const abierta = conPestanasAbiertas(caja);
    // Ningún panel de pestaña queda escondido (lo escondido no se lee), y nada más cambia
    expect(abierta).not.toMatch(/class="dq-panel"[^>]*\bhidden/);
    expect(abierta.match(/class="dq-panel"/g)).toHaveLength(5);
    for (const p of ['ruta', 'preguntas', 'ajustes', 'fallas', 'ideas']) expect(abierta).toContain(`<div class="dq-panel" role="tabpanel" data-pestana="${p}">`);
    expect(abierta).toContain('<p class="dq-al-dia" hidden>');
    expect(abierta.replace(/ hidden/g, '')).toBe(caja.replace(/ hidden/g, ''));
    // Ya abierta, no cambia nada
    expect(conPestanasAbiertas(abierta)).toBe(abierta);
    // La caja viva (el diálogo abierto) llega por outerHTML, donde el navegador escribe hidden=""
    const viva = caja.replace(/ hidden>/g, ' hidden="">');
    expect(conPestanasAbiertas(viva)).not.toMatch(/class="dq-panel"[^>]*\bhidden/);
    expect(conPestanasAbiertas(viva)).toContain('<p class="dq-al-dia" hidden="">');

    const guia = readFileSync(join(__dirname, 'guiaLectura.ts'), 'utf8').replace(/\r\n/g, '\n');
    const textos = guia.match(/function textosDeCajas\([\s\S]*?\n\}/)?.[0] ?? '';
    // La caja de texto y la viva (el diálogo ya abierto) pasan por ella, y el texto sale de las mismas piezas que pide la voz al leer
    expect(textos).toContain('conPestanasAbiertas(fuente)');
    expect(textos).toContain("caja.querySelector('.dq-panel[hidden]') ? caja.outerHTML : null");
    expect(textos).toContain('textosPorLeer(unidadesDe(el).map(({ miembros }) => textoDe(miembros).texto), (t) => guardado(huellaDe(t)))');
    // Lo que la voz pide al leer un bloque: ese mismo textoDe(miembros).texto (leerBloque y prepararSiguiente)
    expect(guia).toContain('audioDe(natural.id, textoDe(b.miembros).texto)');
    expect(guia).toContain('enLaVentana ? textoDe(enLaVentana.miembros).texto');
    // Y las tres vías de la precarga de «¿Dónde quedamos?» van a textosDeCajas: la del cierre, la de abrirlo y la de otro proyecto
    expect(guia.match(/export function prepararDeAntemano\([\s\S]*?\n\}/)?.[0]).toContain('textosDeCajas([c])');
    expect(guia.match(/export async function prepararYEsperar\([\s\S]*?\n\}/)?.[0]).toContain('textosDeCajas([caja])');
  });

  it('el documento y la misión que se preparan al cerrar se pintan con las mismas funciones con que se leen', () => {
    // Misión: la tarjeta (y cada paso que aún no se ve) sale de missionCard, como la de «Hoy»; el idioma, el de la misión
    const sigue = funcion('function prepararLoQueSigue(');
    expect(sigue).toContain('prepararDeAntemano([tarjetaMision(m, false, 1), ...pasosPorVenir(m)], false, false, idiomaDeMision(m))');
    expect(funcion('function pasosPorVenir(')).toContain('enunciadoDeMision(m, new Set(');
    expect(funcion('function pasosPorVenir(')).toContain('listaDePasos(m, true, [i])');
    // Documento: cada parte por leer con porTrozos y las notas del documento, igual que vistaDocumentos (sin esas notas, la
    // respuesta del director a una decisión no se preparaba y su audio se pedía al llegar a ella)
    const partes = funcion('function partesPorLeerDe(');
    expect(partes).toContain("d.estado.notas.filter((x) => x.sobre.tipo === 'documento' && x.sobre.id === otro.ruta)");
    expect(partes).toContain("porTrozos(parte, notas, 'parte')");
    expect(partes).not.toContain("porTrozos(parte, [],");
    const vista = readFileSync(join(__dirname, 'vistaDocumentos.ts'), 'utf8');
    expect(vista).toContain("datos.notas.filter((x) => x.sobre.tipo === 'documento' && x.sobre.id === ruta)");
    expect(vista).toContain('datos.porTrozos(s, notas)');
  });

  it('empieza en el cierre, sin esperar a que llegues: tras una revisión (también en el Studio), tras una urgencia y en un cierre que la página no vio', () => {
    // Tras una revisión: antes de esperar lo primero y de anunciarla
    const terminar = funcion('async function terminarEnSuSitio() {');
    expect(terminar.indexOf('precargarTodoAlCerrar();')).toBeGreaterThan(-1);
    expect(terminar.indexOf('precargarTodoAlCerrar();')).toBeLessThan(terminar.indexOf('await lista;'));
    expect(terminar.indexOf('precargarTodoAlCerrar();')).toBeLessThan(terminar.indexOf('avisarTermino()'));
    // No depende de la espera: el Studio, que no espera nada, también la pide
    expect(terminar.slice(0, terminar.indexOf('precargarTodoAlCerrar();'))).not.toMatch(/if \(lista\) \{\s*$/);
    // Tras una urgencia (y en cada cierre pendiente, que pasa por ella)
    const urgencia = funcion('async function precargarTrasUrgencia() {');
    expect(urgencia.indexOf('precargarTodoAlCerrar();')).toBeGreaterThan(-1);
    expect(urgencia.indexOf('precargarTodoAlCerrar();')).toBeLessThan(urgencia.indexOf('await lista'));
    expect(funcion('async function precargarCierresPendientes() {')).toContain('return precargarTrasUrgencia();');
  });
});

describe('el Studio se recarga una vez al volver tras cerrar su propia revisión (nmwp8jprgtit)', () => {
  const abierta = { pedida: 'p1' };
  const cerrada = { pedida: 'p1', hecha: '2026-11-20T10:00:00Z' };
  // Simula la página: la marca vive entre una llamada y otra, como en sessionStorage
  const pagina = (visto: string | null) => {
    let marca = visto;
    return (esElStudio: boolean, revision: { pedida?: string; hecha?: string | null } | null) => {
      const r = recargaAlVolver({ visto: marca, esElStudio, revision });
      marca = r.visto;
      return r.recargar;
    };
  };
  it('cierra con la página escondida y al volver a verse recarga una vez; volver otra vez sin otro cierre, no', () => {
    const alVolver = pagina(claveDelCierre({ esElStudio: true, revision: abierta }));
    expect(alVolver(true, cerrada)).toBe(true);
    expect(alVolver(true, cerrada)).toBe(false);
    expect(alVolver(true, cerrada)).toBe(false);
  });
  it('lo mismo con el foco de la ventana: la misma decisión', () => {
    const alEnfocar = pagina('');
    expect(alEnfocar(true, cerrada)).toBe(true);
    expect(alEnfocar(true, cerrada)).toBe(false);
  });
  it('un cierre nuevo después vuelve a recargar, una vez', () => {
    const alVolver = pagina('');
    expect(alVolver(true, cerrada)).toBe(true);
    expect(alVolver(true, { pedida: 'p2', hecha: '2026-11-20T11:00:00Z' })).toBe(true);
    expect(alVolver(true, { pedida: 'p2', hecha: '2026-11-20T11:00:00Z' })).toBe(false);
  });
  it('no recarga con otro proyecto activo, con la revisión en marcha, ni con la página recién abierta', () => {
    expect(pagina('')(false, cerrada)).toBe(false);
    expect(pagina('')(true, abierta)).toBe(false);
    expect(pagina(null)(true, cerrada)).toBe(false);
  });
  it('con otro proyecto a la vista, la marca del último cierre mostrado no cambia (nmwprpbbmtit)', () => {
    expect(recargaAlVolver({ visto: 'p0@h0', esElStudio: false, revision: cerrada })).toEqual({ recargar: false, visto: 'p0@h0' });
    expect(recargaAlVolver({ visto: null, esElStudio: false, revision: cerrada })).toEqual({ recargar: false, visto: null });
  });
  it('app.ts lo llama desde visibilitychange y desde focus', () => {
    const app = readFileSync(join(__dirname, 'app.ts'), 'utf8');
    expect(app).toContain("addEventListener('focus', () => void recargarSiCerroElStudio())");
    const i = app.indexOf("addEventListener('visibilitychange'");
    expect(app.slice(i, i + 400)).toContain('void recargarSiCerroElStudio()');
  });
});

describe('la revisión del Studio cierra con otro proyecto activo: al volver al Studio, una sola recarga (nmwprpbbmtit, que repite nmwp8jprgtit)', () => {
  const abierta = { pedida: 'p1' };
  const cerrada = { pedida: 'p1', hecha: '2026-11-21T01:46:37Z' };
  const anterior = { pedida: 'p0', hecha: '2026-11-20T20:00:00Z' };
  // La página: cada llegada de datos pasa por marcaConDatos, cada vuelta (pestaña visible, foco o el selector) por
  // recargaAlVolver; la marca vive entre una y otra, como en sessionStorage, y una recarga empieza otra página
  const pagina = (marcaInicial: string | null = null) => {
    let marca = marcaInicial;
    let primera = true;
    let recargas = 0;
    const datos = (esElStudio: boolean, revision: { pedida?: string; hecha?: string | null } | null, studioReviso = false) => {
      marca = marcaConDatos({ visto: marca, primera, esElStudio, revision, studioReviso });
      primera = false;
    };
    const volver = (esElStudio: boolean, revision: { pedida?: string; hecha?: string | null } | null) => {
      datos(esElStudio, revision);
      const r = recargaAlVolver({ visto: marca, esElStudio, revision });
      marca = r.visto;
      if (r.recargar) {
        recargas += 1;
        // La recarga: otra página, con la misma marca y sus primeros datos
        primera = true;
        datos(esElStudio, revision);
      }
      return r.recargar;
    };
    return { datos, volver, recargas: () => recargas };
  };

  it('pidió la revisión en el Studio, se fue a otro proyecto, cerró escondida y vuelve con el selector: recarga exactamente una vez', () => {
    const p = pagina();
    p.datos(true, abierta);
    // Otro proyecto activo, con la revisión del Studio en curso y luego cerrada (otrasRevisiones)
    p.datos(false, null, true);
    p.datos(false, null, true);
    // Vuelve al Studio: recarga una vez
    expect(p.volver(true, cerrada)).toBe(true);
    // Volver otra vez (foco, pestaña, selector) sin otro cierre: nunca otra, sin bucle
    expect(p.volver(true, cerrada)).toBe(false);
    expect(p.volver(true, cerrada)).toBe(false);
    expect(p.recargas()).toBe(1);
  });

  it('la pestaña se abrió en el otro proyecto mientras el Studio revisaba: su cierre también recarga al volver, una vez', () => {
    const p = pagina();
    p.datos(false, null, true);
    expect(p.volver(true, cerrada)).toBe(true);
    expect(p.volver(true, cerrada)).toBe(false);
    expect(p.recargas()).toBe(1);
  });

  it('un cierre que la página ya mostró no recarga, aunque se pase por otro proyecto y se vuelva', () => {
    const p = pagina();
    p.datos(true, anterior);
    p.datos(false, null, false);
    expect(p.volver(true, anterior)).toBe(false);
    // Ni con la pestaña recargada a mano en el otro proyecto (la marca sigue en sessionStorage)
    const q = pagina(claveDelCierre({ esElStudio: true, revision: anterior }));
    q.datos(false, null, true);
    expect(q.volver(true, anterior)).toBe(false);
    expect(p.recargas() + q.recargas()).toBe(0);
  });

  it('una pestaña abierta en otro proyecto que nunca vio revisar al Studio no recarga por un cierre viejo', () => {
    const p = pagina();
    p.datos(false, null, false);
    expect(p.volver(true, anterior)).toBe(false);
    expect(p.recargas()).toBe(0);
  });

  it('app.ts decide también al volver con el selector, y la marca se pone al día con cada llegada de datos', () => {
    const app = readFileSync(join(__dirname, 'app.ts'), 'utf8');
    const activar = app.slice(app.indexOf('async function activar('), app.indexOf('await mostrarDondeQuedamos();', app.indexOf('async function activar(')));
    expect(activar.indexOf('if (esElStudioActivo(d) && decidirRecargaAlVolver()) return;')).toBeGreaterThan(-1);
    expect(activar.indexOf('decidirRecargaAlVolver()')).toBeLessThan(activar.indexOf('d?.recargaRetenida) return;'));
    const datos = app.slice(app.indexOf("window.addEventListener('estudio:datos'"));
    expect(datos).toContain('marcaConDatos({');
    expect(datos.slice(0, 600)).not.toContain('once: true');
  });
});
