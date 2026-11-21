// Los cargadores (pd_cargadores): una sola pieza, con cada decisión del titular, y su primer grupo, la cuenta de GitHub.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { atributosDelCargador, circuloAlLado, CLAVE_ENVIAR_NOTA, CLAVE_ESFUERZO, CLAVE_MEDIR, CLAVE_MODELO, CLAVE_RESPALDO, CLAVE_PEDIR_REVISION, claveAprobar, claveEntregar, clavePaso, claveResponder, contenidoDelBoton, corre, correrGuardando, crearCargadores, ESPERA_LARGA, faseEnCurso, lineaDelCargador, RETRASO_DEL_CIRCULO, type Relojes } from './cargador';
import { vistaHoy, type DatosHoy } from './todayView';
import { botonesResponder } from './vistaPropuestas';

/** Relojes de mentira: avanzar(ms) dispara lo que toca. */
function relojesDePrueba() {
  let ahora = 0;
  let n = 0;
  const pendientes = new Map<number, { en: number; f: () => void }>();
  const relojes: Relojes = {
    setTimeout: (f, ms) => { pendientes.set(++n, { en: ahora + ms, f }); return n; },
    clearTimeout: (x) => { pendientes.delete(x as number); },
  };
  const avanzar = (ms: number) => {
    ahora += ms;
    for (const [id, p] of [...pendientes].sort((a, b) => a[1].en - b[1].en)) if (p.en <= ahora) { pendientes.delete(id); p.f(); }
  };
  return { relojes, avanzar };
}

/** Una promesa que se resuelve o falla cuando se le dice. */
function aMano<T>() {
  let ok!: (x: T) => void;
  let mal!: (e: unknown) => void;
  const p = new Promise<T>((a, b) => { ok = a; mal = b; });
  return { p, ok, mal };
}

describe('el cargador, una pieza para toda acción que tarda (pd_cargadores)', () => {
  it('la fase por el tiempo: apagado ya, el círculo a los 500 ms, la línea a los 30 s (nmwi6rnf5tit, nmwf47raotit)', () => {
    expect(RETRASO_DEL_CIRCULO).toBe(500);
    expect(ESPERA_LARGA).toBe(30_000);
    expect(faseEnCurso(0)).toBe('apagado');
    expect(faseEnCurso(499)).toBe('apagado');
    expect(faseEnCurso(500)).toBe('girando');
    expect(faseEnCurso(29_999)).toBe('girando');
    expect(faseEnCurso(30_000)).toBe('largo');
  });

  it('apagado en el mismo instante, el círculo a los 500 ms, y si sale bien, nada más que el cambio (nmwjl7fuktit)', async () => {
    const { relojes, avanzar } = relojesDePrueba();
    let pintadas = 0;
    const c = crearCargadores(() => pintadas++, relojes);
    const accion = aMano<string>();
    const corre = c.correr('cuenta-git', { guarda: true }, () => accion.p);
    expect(c.estado('cuenta-git')?.fase).toBe('apagado');
    expect(atributosDelCargador(c.estado('cuenta-git'))).toContain(' disabled');
    expect(contenidoDelBoton('Save', c.estado('cuenta-git'))).toBe('Save');
    expect(pintadas).toBe(1);
    avanzar(499);
    expect(c.estado('cuenta-git')?.fase).toBe('apagado');
    avanzar(1);
    expect(c.estado('cuenta-git')?.fase).toBe('girando');
    // En un botón de solo palabras, el círculo a la izquierda y las palabras como están (nmwf5w992tit)
    expect(contenidoDelBoton('Save', c.estado('cuenta-git'))).toBe('<span class="circulo-carga" aria-hidden="true"></span>Save');
    // En uno con icono, el círculo en su lugar (nmwduwqi5tit)
    expect(contenidoDelBoton('Use', c.estado('cuenta-git'), '📁')).not.toContain('📁');
    // Mientras corre, otra con la misma clave no se lanza
    expect(await c.correr('cuenta-git', {}, async () => 'otra')).toBeUndefined();
    accion.ok('hecho');
    expect(await corre).toBe('hecho');
    expect(c.estado('cuenta-git')).toBeNull();
    expect(atributosDelCargador(null)).toBe('');
    expect(lineaDelCargador('cuenta-git', null)).toBe('');
    // Ningún reloj queda vivo
    avanzar(ESPERA_LARGA);
    expect(c.estado('cuenta-git')).toBeNull();
  });

  it('a los 30 s: en una acción que guarda, «Sigue guardando…» sin «Dejar de esperar» (nmwjl7mz1tit, nmwj6inkbtit)', async () => {
    const { relojes, avanzar } = relojesDePrueba();
    const c = crearCargadores(() => undefined, relojes);
    const accion = aMano<void>();
    const corre = c.correr('cuenta-git', { guarda: true }, () => accion.p);
    avanzar(ESPERA_LARGA);
    const e = c.estado('cuenta-git');
    expect(e?.fase).toBe('largo');
    const linea = lineaDelCargador('cuenta-git', e);
    expect(linea).toContain('role="status"');
    expect(linea).not.toContain('data-dejar-de-esperar');
    // «Dejar de esperar» no hace nada en una que guarda: sigue apagado hasta que termine
    c.dejarDeEsperar('cuenta-git');
    expect(atributosDelCargador(c.estado('cuenta-git'))).toContain(' disabled');
    accion.ok();
    await corre;
    expect(c.estado('cuenta-git')).toBeNull();
  });

  it('a los 30 s, en una que no guarda, «Dejar de esperar» la suelta y termina en silencio (nmwf47raotit, nmwgj3mnptit)', async () => {
    const { relojes, avanzar } = relojesDePrueba();
    const c = crearCargadores(() => undefined, relojes);
    const accion = aMano<void>();
    const corre = c.correr('cambiar', {}, () => accion.p);
    avanzar(ESPERA_LARGA);
    expect(lineaDelCargador('cambiar', c.estado('cambiar'))).toContain('data-dejar-de-esperar="cambiar"');
    c.dejarDeEsperar('cambiar');
    expect(c.estado('cambiar')).toBeNull();
    // Si después falla, tampoco dice nada: ya no se la esperaba
    accion.mal(new Error('tarde'));
    expect(await corre).toBeUndefined();
    expect(c.estado('cambiar')).toBeNull();
  });

  it('si falla, el botón vuelve a la normalidad con la línea roja al lado (nmwjk36a8tit); otro intento la quita', async () => {
    const { relojes, avanzar } = relojesDePrueba();
    const c = crearCargadores(() => undefined, relojes);
    const r = await c.correr('cuenta-git', { guarda: true, mensajeDeError: (e) => `Not saved: ${(e as Error).message}` }, async () => { throw new Error('no <red>'); });
    expect(r).toBeUndefined();
    const e = c.estado('cuenta-git');
    expect(e?.fase).toBe('error');
    expect(atributosDelCargador(e)).toBe('');
    expect(contenidoDelBoton('Save', e)).toBe('Save');
    expect(lineaDelCargador('cuenta-git', e)).toBe('<span class="linea-cargador falla" role="alert">Not saved: no &lt;red&gt;</span>');
    // Un reloj viejo no la pisa
    avanzar(ESPERA_LARGA);
    expect(c.estado('cuenta-git')?.fase).toBe('error');
    const otra = aMano<void>();
    const corre = c.correr('cuenta-git', { guarda: true }, () => otra.p);
    expect(c.estado('cuenta-git')?.fase).toBe('apagado');
    otra.ok();
    await corre;
    c.olvidar('cuenta-git');
    expect(c.estado('cuenta-git')).toBeNull();
  });
});

describe('el primer grupo: la cuenta de GitHub en «Proyecto» › «Dónde está» (nmwimti7dtit)', () => {
  const app = (readFileSync(join(__dirname, 'app.ts'), 'utf-8') + readFileSync(join(__dirname, 'dialogoNota.ts'), 'utf-8'));
  const vista = readFileSync(join(__dirname, 'vistaProyecto.ts'), 'utf-8');
  it('el formulario corre con el cargador, como acción que guarda, sin aviso al salir bien', () => {
    const guardar = app.slice(app.indexOf("if (form.id === 'form-cuenta-git')"), app.indexOf("if (form.id === 'form-proyecto')"));
    expect(guardar).toContain("cargadores.correr('cuenta-git', { guarda: true");
    expect(guardar).not.toContain('avisar(');
    expect(app).toContain("cargadorCuenta: cuentaGuardadaDe === d.activo ? cargadores.estado('cuenta-git') : null");
    expect(app).toContain('cargadores.dejarDeEsperar(ds.dejarDeEsperar)');
    expect(vista).toContain('data-cargador="cuenta-git"${atributosDelCargador(cargadorCuenta)}>${contenidoDelBoton(tx(\'proyecto.cuentaGitGuardar\'), cargadorCuenta)}</button>${lineaDelCargador(\'cuenta-git\', cargadorCuenta)}');
  });
  it('el círculo y la línea tienen sus estilos (también para el segundo grupo)', () => {
    const estilos = readFileSync(join(__dirname, 'estilos.css'), 'utf-8');
    expect(estilos).toMatch(/^\.circulo-carga \{[^}]*animation: pt-gira/m);
    expect(estilos).toMatch(/^\.linea-cargador\.falla \{[^}]*--peligro-texto/m);
  });
});

describe('el segundo grupo: entregar una misión y marcar un paso (pd_cargadores)', () => {
  it('una clave por misión y por paso', () => {
    expect(claveEntregar('t_uno')).toBe('entregar:t_uno');
    expect(clavePaso('t_uno', 2)).toBe('paso:t_uno:2');
  });

  it('si la acción sale bien, devuelve true y no queda nada; apagado mientras corre, sin «Dejar de esperar» a los 30 s', async () => {
    const { relojes, avanzar } = relojesDePrueba();
    const c = crearCargadores(() => undefined, relojes);
    const a = aMano<boolean>();
    const corre = correrGuardando(c, claveEntregar('m'), 'No se guardó', () => a.p);
    expect(atributosDelCargador(c.estado('entregar:m'))).toContain('disabled');
    avanzar(RETRASO_DEL_CIRCULO);
    expect(contenidoDelBoton('Entregar', c.estado('entregar:m'))).toContain('circulo-carga');
    avanzar(ESPERA_LARGA);
    const linea = lineaDelCargador('entregar:m', c.estado('entregar:m'));
    expect(linea).toContain('linea-cargador');
    expect(linea).not.toContain('data-dejar-de-esperar');
    c.dejarDeEsperar('entregar:m');
    expect(c.estado('entregar:m')?.fase).toBe('largo');
    a.ok(true);
    expect(await corre).toBe(true);
    expect(c.estado('entregar:m')).toBeNull();
  });

  it('si la acción devuelve false (como accion de la página), el botón vuelve y la línea roja dice qué falló', async () => {
    const c = crearCargadores(() => undefined);
    expect(await correrGuardando(c, clavePaso('m', 0), 'No se guardó', async () => false)).toBe(false);
    const e = c.estado('paso:m:0');
    expect(e?.fase).toBe('error');
    expect(atributosDelCargador(e)).toBe('');
    expect(lineaDelCargador('paso:m:0', e)).toBe('<span class="linea-cargador falla" role="alert">No se guardó</span>');
    // Otro intento la quita
    expect(await correrGuardando(c, clavePaso('m', 0), 'No se guardó', async () => true)).toBe(true);
    expect(c.estado('paso:m:0')).toBeNull();
  });

  it('mientras corre, un segundo intento con la misma clave no se lanza (también en el tercer grupo)', async () => {
    const c = crearCargadores(() => undefined);
    const a = aMano<boolean>();
    let veces = 0;
    const primera = correrGuardando(c, 'entregar:m', 'x', () => { veces++; return a.p; });
    expect(await correrGuardando(c, 'entregar:m', 'x', async () => { veces++; return true; })).toBe(false);
    a.ok(true);
    await primera;
    expect(veces).toBe(1);
  });
});

describe('el tercer grupo (nmwjofnwgtit) y «Pedir revisión» (nmwk5mrf4tit)', () => {
  const app = (readFileSync(join(__dirname, 'app.ts'), 'utf-8') + readFileSync(join(__dirname, 'dialogoNota.ts'), 'utf-8')).replace(/\r\n/g, '\n');
  const tramo = (desde: string, hasta: string) => app.slice(app.indexOf(desde), app.indexOf(hasta, app.indexOf(desde) + desde.length));

  it('una clave por acción: la nota, la revisión, cada respuesta a una propuesta y cada decisión', () => {
    expect(CLAVE_ENVIAR_NOTA).toBe('enviar-nota');
    expect(CLAVE_PEDIR_REVISION).toBe('pedir-revision');
    expect(claveResponder('p1', 'aceptada')).not.toBe(claveResponder('p1', 'descartada'));
    expect(claveAprobar('docs/a.md', '2. Parte', 'Uno')).toBe('aprobar:docs/a.md|2. Parte|Uno');
    expect(corre(null)).toBe(false);
    expect(corre({ fase: 'apagado', guarda: true })).toBe(true);
    expect(corre({ fase: 'error', guarda: true, error: 'x' })).toBe(false);
  });

  it('el ✉: «fallo» deja la línea roja con el porqué que se supo después, sin pisar un envío en curso', async () => {
    const { relojes, avanzar } = relojesDePrueba();
    const c = crearCargadores(() => undefined, relojes);
    const a = aMano<boolean>();
    const corriendo = c.correr(CLAVE_ENVIAR_NOTA, { guarda: true }, () => a.p);
    c.fallo(CLAVE_ENVIAR_NOTA, 'no');
    expect(c.estado(CLAVE_ENVIAR_NOTA)?.fase).toBe('apagado');
    avanzar(RETRASO_DEL_CIRCULO);
    expect(contenidoDelBoton('Leave it', c.estado(CLAVE_ENVIAR_NOTA))).toContain('circulo-carga');
    a.ok(false);
    // Devuelve lo que dijo el guardado: false, sin línea roja todavía
    expect(await corriendo).toBe(false);
    expect(c.estado(CLAVE_ENVIAR_NOTA)).toBeNull();
    c.fallo(CLAVE_ENVIAR_NOTA, 'Not saved: no <server>. It is still here: try again.');
    expect(lineaDelCargador(CLAVE_ENVIAR_NOTA, c.estado(CLAVE_ENVIAR_NOTA))).toBe('<span class="linea-cargador falla" role="alert">Not saved: no &lt;server&gt;. It is still here: try again.</span>');
    // Otro intento la quita
    const otra = c.correr(CLAVE_ENVIAR_NOTA, { guarda: true }, async () => true);
    expect(c.estado(CLAVE_ENVIAR_NOTA)?.fase).toBe('apagado');
    expect(await otra).toBe(true);
    expect(c.estado(CLAVE_ENVIAR_NOTA)).toBeNull();
  });

  it('el ✉ envía con su cargador: el botón no cambia de palabras, el círculo a los 500 ms y el porqué en la línea roja', () => {
    const pedir = tramo('function pedir(', '\n}\n');
    expect(pedir).toContain('<span class="linea-envio" data-linea-envio></span>');
    expect(pedir).toContain('enviar.innerHTML = contenidoDelBoton(esc(o.boton), e);');
    expect(pedir).toContain('const guardado = await envio.correr(CLAVE_ENVIAR_NOTA, { guarda: true }');
    expect(pedir).toContain('envio.fallo(CLAVE_ENVIAR_NOTA,');
  });

  it('responder una propuesta: el oprimido gira, el otro queda apagado, y la línea roja si falla', () => {
    const girando = { fase: 'girando' as const, guarda: true };
    const html = botonesResponder('p1', undefined, (k) => (k === claveResponder('p1', 'aceptada') ? girando : null));
    const aceptar = html.slice(html.indexOf('data-responder="p1|aceptada"'), html.indexOf('</button>', html.indexOf('data-responder="p1|aceptada"')));
    const descartar = html.slice(html.indexOf('data-responder="p1|descartada"'), html.indexOf('</button>', html.indexOf('data-responder="p1|descartada"')));
    expect(aceptar).toContain('aria-busy="true"');
    expect(aceptar).toContain('circulo-carga');
    expect(descartar).toContain(' disabled');
    expect(descartar).not.toContain('circulo-carga');
    const fallida = botonesResponder('p1', undefined, (k) => (k === claveResponder('p1', 'descartada') ? { fase: 'error', guarda: true, error: 'No' } : null));
    expect(fallida).toContain('<span class="linea-cargador falla" role="alert">No</span>');
    // Sin cargador, como antes
    expect(botonesResponder('p1', undefined)).not.toContain('aria-busy');
    expect(tramo('} else if (ds.responder) {', '} else if (ds.usarCandidato) {').match(/correrGuardando\(cargadores, clave,/g)).toHaveLength(2);
  });

  it('los dos botones de una decisión: «Apruebo» corre con su cargador y «Decido otra cosa» se apaga con él', () => {
    const botones = tramo('function botonesDecision(', '\n}\n');
    expect(botones).toContain('const carg = cargadores.estado(claveAprobar(ruta, parte, nombre));');
    expect(botones).toContain('${atributosDelCargador(carg)}>${contenidoDelBoton(');
    expect(botones).toContain('${lineaDelCargador(claveAprobar(ruta, parte, nombre), carg)}');
    expect(botones).toContain("data-comentar=\"${base}|decide\" title=\"${esc(tx('docs.decidirOtraTitulo'))}\"${correCargador(carg) ? ' disabled' : ''}>");
    expect(tramo('} else if (ds.aprobar !== undefined) {', '} else if (ds.entendido !== undefined) {')).toContain('await correrGuardando(cargadores, claveAprobar(ruta, seccion, decision), tx(\'cargador.noGuardo\')');
  });

  it('«Pedir revisión»: el mismo cargador en la cabecera y en «Hoy», con la línea roja si no se pudo pedir', () => {
    const pedirLa = tramo('async function pedirLaRevision(', '\n}\n');
    expect(pedirLa).toContain("return correrGuardando(cargadores, CLAVE_PEDIR_REVISION, tx('cargador.noPidio'), pedido);");
    const cabecera = tramo('function botonRevision', 'async function mostrarFalla');
    expect(cabecera).toContain('const cargaPedir = cargadores.estado(CLAVE_PEDIR_REVISION);');
    expect(cabecera).toContain("${atributosDelCargador(cargaPedir)}>${contenidoDelBoton(tx('cabeza.pedirRevision'), cargaPedir, icono('revisar'))}");
    // La línea roja va a su izquierda: a su derecha está su «?» (palabras.ts)
    expect(cabecera).toContain('return `${lineaDelCargador(CLAVE_PEDIR_REVISION, cargaPedir)}<button');
    // «Hoy», sin misión: su botón también
    const datos = { plan: { misiones: [] }, estado: {}, rol: 'leonc', personas: ['leonc'], arranque: '', etapa: 'en_marcha', abiertasDe: () => [], tarjeta: () => '', cola: () => '', pasoSinMision: () => ({ que: 'pedir', texto: 'Pide la revisión' }), botonIr: () => '' } as unknown as DatosHoy;
    const girando = vistaHoy({ ...datos, cargadorPedir: { fase: 'girando', guarda: true } });
    expect(girando).toContain('data-revision="pedir" data-origen="hoy"');
    expect(girando).toContain('aria-busy="true"');
    expect(girando).toContain('circulo-carga');
    expect(vistaHoy({ ...datos, cargadorPedir: { fase: 'error', guarda: true, error: 'No' } })).toContain('linea-cargador falla');
  });
});

describe('el último grupo: modelo, esfuerzo, medir el núcleo y el respaldo (nmwkbkofitit, nmwl4wnrptit, nmwl4wakktit)', () => {
  it('cada uno tiene su clave, distinta de las demás', () => {
    const claves = [CLAVE_MODELO, CLAVE_ESFUERZO, CLAVE_MEDIR, CLAVE_RESPALDO, CLAVE_PEDIR_REVISION, CLAVE_ENVIAR_NOTA];
    expect(new Set(claves).size).toBe(claves.length);
  });

  it('el círculo al lado de un control sin palabras gira solo a partir de los 500 ms', () => {
    expect(circuloAlLado(null)).toBe('');
    expect(circuloAlLado({ fase: 'apagado', guarda: true })).toBe('');
    expect(circuloAlLado({ fase: 'error', guarda: true, error: 'No' })).toBe('');
    expect(circuloAlLado({ fase: 'girando', guarda: true })).toContain('circulo-carga');
    expect(circuloAlLado({ fase: 'largo', guarda: true })).toContain('circulo-carga');
  });

  it('la línea del respaldo: con el círculo a la izquierda y las mismas palabras, sin cambiarlas', () => {
    const girando = contenidoDelBoton('Último respaldo: hace 3 h', { fase: 'girando', guarda: true });
    expect(girando.startsWith('<span class="circulo-carga"')).toBe(true);
    expect(girando).toContain('Último respaldo: hace 3 h');
    expect(contenidoDelBoton('Último respaldo: hace 3 h', { fase: 'apagado', guarda: true })).toBe('Último respaldo: hace 3 h');
  });
});
