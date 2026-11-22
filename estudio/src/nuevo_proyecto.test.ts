import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { esSubcarpeta } from '../../src/director/repositorio';
import { avisoSinTranscribir, botonEntregar, comprobarConLimite, leerDictado, conLaTraduccion, conMetaDetectada, pareceDeOtroIdioma, conRepositorioEntero, datosDeNuevo, datosDeRapido, decidirComprobacion, entregaElegida, nombreLegible, esperarTranscripcion, htmlEscaneo, htmlLento, htmlNuevo, htmlRapido, htmlSubcarpeta, LIMITE_COMPROBACION_MS, sumarAlCampo, type Candidato, type Comprobacion, type Entrega } from './nuevo_proyecto';
import { en } from './textos/en';
import { es } from './textos/es';
import { ponerIdioma } from './textos';

afterEach(() => ponerIdioma('es'));

describe('no se entrega mientras una nota de voz se transcribe (nmw9wgco4tit)', () => {
  const boton = (titulo?: string) => {
    const attrs = new Map<string, string>(titulo ? [['data-titulo', titulo]] : []);
    const clases = new Set<string>();
    return {
      disabled: false, title: titulo ?? '',
      classList: { toggle: (c: string, si: boolean) => (si ? clases.add(c) : clases.delete(c)), has: (c: string) => clases.has(c) },
      setAttribute: (k: string, v: string) => attrs.set(k, v),
      getAttribute: (k: string) => attrs.get(k) ?? null,
      removeAttribute: (k: string) => { attrs.delete(k); },
      attrs,
    };
  };
  it('«Entregar y pedir su diagnóstico» vuelve a su título (que usa el plan) al terminar la transcripción', () => {
    ponerIdioma('en');
    const b = boton('uses your Claude plan');
    const raiz = { querySelectorAll: (s: string) => (s === 'button[type="submit"]' ? [b] : []) } as unknown as ParentNode;
    esperarTranscripcion(raiz, true);
    expect(b.title).toContain('being transcribed');
    esperarTranscripcion(raiz, false);
    expect(b.title).toBe('uses your Claude plan');
  });
  it('el formulario de siempre solo entrega pidiendo el diagnóstico, con su título, en los dos idiomas (pd_entregar_y_diagnosticar, nmwai6p98tit)', () => {
    ponerIdioma('en');
    const en = htmlRapido(false);
    expect(en).not.toContain('Only deliver');
    expect(en.match(/type="submit"/g)).toHaveLength(1);
    expect(en).toContain('>Deliver and request its diagnosis</button>');
    expect(en).toMatch(/data-diagnostico[^>]*title="[^"]*uses your Claude plan/);
    ponerIdioma('es');
    expect(htmlRapido(false)).toContain('>Entregar y pedir su diagnóstico</button>');
  });
  it('los botones de entregar se desactivan con su círculo y su razón, y vuelven al terminar', () => {
    ponerIdioma('en');
    const b = boton();
    const raiz = { querySelectorAll: (s: string) => (s === 'button[type="submit"]' ? [b] : []) } as unknown as ParentNode;
    esperarTranscripcion(raiz, true);
    expect(b.disabled).toBe(true);
    expect(b.classList.has('esperando')).toBe(true);
    expect(b.attrs.get('aria-busy')).toBe('true');
    expect(b.title).toContain('being transcribed');
    esperarTranscripcion(raiz, false);
    expect(b.disabled).toBe(false);
    expect(b.classList.has('esperando')).toBe(false);
    expect(b.attrs.has('aria-busy')).toBe(false);
  });

  it('el envío revisa la transcripción y la grabación antes de entregar', () => {
    const fuente = readFileSync(new URL('./nuevo_proyecto.ts', import.meta.url), 'utf8');
    const envio = fuente.slice(fuente.indexOf("dlg.addEventListener('submit'"));
    expect(envio.indexOf('transcribiendo > 0 || grabando')).toBeGreaterThan(-1);
    expect(envio.indexOf('transcribiendo > 0 || grabando')).toBeLessThan(envio.indexOf("cual === 'rapido'"));
  });
});

describe('entregar un proyecto, contándolo también hablando (nmw9v9sbdtit)', () => {
  it('las dos puertas: primero la carpeta, después un solo campo, «Cuéntame tu proyecto», con su pista y su ejemplo, en los dos idiomas (pd_campo_libre)', () => {
    ponerIdioma('en');
    for (const html of [htmlRapido(true), htmlNuevo(true)]) {
      expect(html).toContain('<span class="etiqueta-campo">Tell me about your project');
      expect(html).toContain('What it is, who it is for and where you want to take it, in your own words. You can also record it.');
      expect(html).toContain('placeholder="E.g.: A booking site for a dentist; I want patients to book online"');
      // La carpeta va antes que el campo (nmwk5nkpltit), y es el único campo de texto largo
      expect(html.indexOf('name="ruta"')).toBeLessThan(html.indexOf('name="cuenta"'));
      expect(html.match(/<textarea/g)?.length).toBe(1);
      // Sin nombre, sin meta y sin «cuándo está completo» (nmwf519gptit, nmwfltw1dtit, nmwb0yxt4tit)
      expect(html).not.toMatch(/name="(nombre|contexto|metaInicial|terminado)"/);
      expect(html).not.toMatch(/Project name|Where do you want to go\?|When will you consider it complete\?/);
    }
    // En uno que ya existe puede quedar vacío; en uno nuevo, no (nmwfltg6rtit)
    expect(htmlRapido(true)).toMatch(/<textarea name="cuenta" rows="4" placeholder=/);
    expect(htmlRapido(true)).toContain('You can leave it empty: I read everything from the folder.');
    expect(htmlNuevo(true)).toMatch(/<textarea name="cuenta" rows="4" required placeholder=/);
    expect(htmlNuevo(true)).not.toContain('You can leave it empty');
    ponerIdioma('es');
    expect(htmlRapido(true)).toContain('<span class="etiqueta-campo">Cuéntame tu proyecto');
    expect(htmlNuevo(true)).toContain('placeholder="Ej.: Una página de citas para un dentista; quiero que los pacientes reserven en línea"');
  });

  it('el campo lleva su «Grabar», justo debajo; sin con qué transcribir, ninguno', () => {
    for (const html of [htmlRapido(true), htmlNuevo(true)]) expect(html).toMatch(/<textarea name="cuenta"[^>]*><\/textarea><\/label>\s*<div class="grabadora dictar-campo" data-dictar="cuenta"/);
    expect(htmlRapido(false)).not.toContain('data-dictar');
    expect(htmlNuevo(false)).not.toContain('data-dictar');
  });

  it('el nombre sale de la carpeta, legible y sin modelo (nmwfltw1dtit), y todo lo contado va entero a «Qué es» (nmwdicgh1tit)', () => {
    expect(nombreLegible('C:/proyectos/talleres-app')).toBe('Talleres app');
    expect(nombreLegible('C:\\www\\mi_tienda.web\\')).toBe('Mi tienda web');
    expect(nombreLegible('C:/www/STL')).toBe('STL');
    expect(nombreLegible('')).toBe('');
    expect(datosDeNuevo({ ruta: ' C:/www/citas-dentista ', cuenta: ' Una página de citas; quiero que reserven en línea. ' })).toEqual({ tipo: 'nuevo', nombre: 'Citas dentista', ruta: 'C:/www/citas-dentista', contexto: 'Una página de citas; quiero que reserven en línea.', metaInicial: '', terminado: '' });
    const envio = readFileSync(new URL('./nuevo_proyecto.ts', import.meta.url), 'utf8');
    expect(envio).toContain("datosDeNuevo(Object.fromEntries(new FormData(form).entries()) as Record<string, string>)");
  });

  it('lo dicho se suma al final de lo que ya tenía el campo', () => {
    const campo = { value: 'Funciona en mi computador.' };
    sumarAlCampo(campo, ' Quiero publicarlo en dos meses. ');
    expect(campo.value).toBe('Funciona en mi computador.\n\nQuiero publicarlo en dos meses.');
    const vacio = { value: '' };
    sumarAlCampo(vacio, 'Solo lo dicho.');
    expect(vacio.value).toBe('Solo lo dicho.');
  });

  it('lo contado llega como el relato del titular (contexto), nunca como la meta', () => {
    const d = datosDeRapido({ ruta: ' C:/proyectos/tienda/ ', cuenta: ' Está a medias; quiero venderla en marzo. ' });
    expect(d).toEqual({ tipo: 'existente', nombre: 'Tienda', ruta: 'C:/proyectos/tienda/', contexto: 'Está a medias; quiero venderla en marzo.', metaInicial: '', terminado: '' });
  });

  it('la grabadora del campo no envía el formulario, y la transcripción llega de app.ts sin importarlo', () => {
    const fuente = readFileSync(new URL('./nuevo_proyecto.ts', import.meta.url), 'utf8');
    expect(fuente).toContain('new Grabadora(caja, true, false)');
    expect(fuente).not.toMatch(/from '\.\/app'/);
    const app = readFileSync(new URL('./app.ts', import.meta.url), 'utf8');
    expect(app).toContain('pedirProyectoNuevo((audio) => dictarConRazon(audio, true), async (e) => {');
  });
});

describe('la comprobación de lo contado antes de entregar (pd_campo_libre; nmwkbl5d4tit, nmwl4xd7utit, nmwl4xn0mtit, nmwlfn2pbtit, nmwlfndp5tit)', () => {
  const entrega = (contexto: string): Entrega => ({ modo: 'uno', diagnosticar: true, datos: datosDeRapido({ ruta: 'C:/www/tienda', cuenta: contexto }) });

  it('completo: entrega al instante, sin pregunta, con la parte de la meta marcada para «Detectado»', () => {
    expect(decidirComprobacion({ falta: [], meta: ' que reserven en línea ' })).toEqual({ accion: 'entregar', meta: 'que reserven en línea' });
    const e = conMetaDetectada(entrega('Una página de citas; que reserven en línea.'), 'que reserven en línea');
    // Todo el texto sigue yendo a «Qué es»; la meta hallada va aparte y metaInicial queda vacía (nmwdicgh1tit)
    expect(e.datos).toMatchObject({ contexto: 'Una página de citas; que reserven en línea.', metaInicial: '', metaDetectada: 'que reserven en línea' });
    expect(conMetaDetectada(entrega('x'), undefined).datos).not.toHaveProperty('metaDetectada');
    expect(conMetaDetectada(entrega('x'), '  ').datos).not.toHaveProperty('metaDetectada');
  });

  it('el error del servidor, sin texto, sugiere qué contar, con un ejemplo (nmwmepe5atit)', () => {
    expect(en['servidor.api.proyectoNuevoNecesita']).toContain('for example');
    expect(es['servidor.api.proyectoNuevoNecesita']).toContain('por ejemplo');
  });

  it('contado en otro idioma (nmwjl8tuutit, nmwjm4r7atit): «Qué es» recibe la traducción y las palabras de la persona quedan aparte', () => {
    const e = entrega('Una página de citas para dentistas. Quiero que los pacientes reserven en línea.');
    const c: Comprobacion = { falta: [], meta: 'I want patients to book online.', traduccion: 'A booking site for dentists. I want patients to book online.' };
    const lista = conMetaDetectada(conLaTraduccion(e, c, 'en'), decidirComprobacion(c).meta);
    expect(lista.datos).toMatchObject({ contexto: 'A booking site for dentists. I want patients to book online.', contextoOriginal: 'Una página de citas para dentistas. Quiero que los pacientes reserven en línea.', metaDetectada: 'I want patients to book online.' });
    expect(lista.datos).not.toHaveProperty('porTraducir');
    // En el idioma de la interfaz: nada cambia
    expect(conLaTraduccion(e, { falta: [] }, 'es')).toEqual(e);
  });

  it('sin traducción (nmwjm4dcjtit, nmwjogccbtit): se entrega igual, tal cual, con la marca para la primera revisión', () => {
    const e = entrega('Una página de citas para dentistas. Quiero que los pacientes reserven en línea.');
    // El modelo dijo que es de otro idioma y no lo tradujo
    expect(conLaTraduccion(e, { falta: [], sinTraducir: true }, 'en').datos).toMatchObject({ contexto: e.datos.contexto, porTraducir: true });
    // No se pudo comprobar: lo dice el texto por sus palabras, sin modelo
    expect(conLaTraduccion(e, null, 'en').datos).toMatchObject({ contexto: e.datos.contexto, porTraducir: true });
    expect(conLaTraduccion(e, null, 'es')).toEqual(e);
    expect(conLaTraduccion(entrega('A booking site for dentists; I want patients to book online.'), null, 'en').datos).not.toHaveProperty('porTraducir');
  });

  it('adivinar el idioma sin modelo: con muy pocas palabras o empatado, no lo afirma', () => {
    expect(pareceDeOtroIdioma('Una tienda de ropa para la gente del barrio', 'en')).toBe(true);
    expect(pareceDeOtroIdioma('A shop for the people of the neighbourhood', 'es')).toBe(true);
    expect(pareceDeOtroIdioma('A shop for the people of the neighbourhood', 'en')).toBe(false);
    expect(pareceDeOtroIdioma('booking dentistas', 'en')).toBe(false);
    expect(pareceDeOtroIdioma('', 'es')).toBe(false);
  });

  it('«Qué es» de un proyecto sin traducir muestra lo contado tal cual con «They will be translated in the first review»; el servidor guarda el original', () => {
    expect(en['proyecto.seTraducira']).toBe('They will be translated in the first review');
    expect(es['proyecto.seTraducira']).toBe('Se traducirá en la primera revisión');
    const vista = readFileSync(new URL('./vistaProyecto.ts', import.meta.url), 'utf8');
    expect(vista).toContain("p.contextoPorTraducir && p.contexto ? `<small class=\"pista-campo por-traducir\">${tx('proyecto.seTraducira')}</small>`");
    const api = readFileSync(new URL('../servidor/api.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
    expect(api).toContain("const contextoPorTraducir = !!contexto && !contextoOriginal && cuerpo.porTraducir === true;");
    expect(api).toContain("comprobarCuenta(texto, (await leerLocal(raiz)).idioma ?? 'es')");
    const proyectos = readFileSync(new URL('../../src/director/proyectos.ts', import.meta.url), 'utf8');
    expect(proyectos).toContain('{ contextoOriginal: datos.contextoOriginal }');
    const bandeja = readFileSync(new URL('../../tools/director/bandeja.ts', import.meta.url), 'utf8');
    expect(bandeja).toContain('if (proyecto.contextoPorTraducir && proyecto.contexto)');
  });

  it('lento: a los 30 segundos avisa, con «Hand it over without checking»; antes, nada', async () => {
    vi.useFakeTimers();
    try {
      let tardo = 0;
      let responder: (c: Comprobacion | null) => void = () => {};
      const p = comprobarConLimite('Algo', () => new Promise((ok) => { responder = ok; }), () => { tardo++; });
      await vi.advanceTimersByTimeAsync(LIMITE_COMPROBACION_MS - 1);
      expect(tardo).toBe(0);
      await vi.advanceTimersByTimeAsync(1);
      expect(tardo).toBe(1);
      // La comprobación sigue esperándose y, si llega después, vale
      responder({ falta: [] });
      expect(await p).toEqual({ falta: [] });
      expect(LIMITE_COMPROBACION_MS).toBe(30_000);
    } finally {
      vi.useRealTimers();
    }
    ponerIdioma('en');
    expect(htmlLento()).toContain('<p>This is taking longer than usual</p>');
    expect(htmlLento()).toContain('data-sin-comprobar>Hand it over without checking</button>');
    ponerIdioma('es');
    expect(htmlLento()).toContain('Esto está tardando más de lo normal');
    expect(htmlLento()).toContain('Entregarlo sin comprobar');
  });

  it('una comprobación que responde a tiempo no avisa nada', async () => {
    vi.useFakeTimers();
    try {
      let tardo = 0;
      const r = await comprobarConLimite('Algo', async () => ({ falta: ['meta'] }), () => { tardo++; });
      expect(r).toEqual({ falta: ['meta'] });
      await vi.advanceTimersByTimeAsync(LIMITE_COMPROBACION_MS * 2);
      expect(tardo).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('no se pudo comprobar (sin programa, sin sesión, un error, respuesta ilegible): entrega sin la comprobación, callada', async () => {
    expect(decidirComprobacion(null)).toEqual({ accion: 'entregar' });
    expect(await comprobarConLimite('Algo', async () => { throw new Error('sin Claude Code'); }, () => {})).toBeNull();
    expect(await comprobarConLimite('Algo', async () => null, () => {})).toBeNull();
  });

  it('el formulario: sin texto o sin comprobación entrega directo; con la comprobación, entrega siempre, sin pregunta; el botón de lo lento entrega lo pendiente', () => {
    const f = readFileSync(new URL('./nuevo_proyecto.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
    const c = f.slice(f.indexOf('const conLaComprobacion = async'), f.indexOf('// ── Lo de siempre y uno nuevo'));
    expect(f).toContain("const CLAVE_COMPROBAR_CUENTA = 'comprobar-cuenta';");
    expect(c).toContain('if (!comprobar || !e.datos.contexto) return conLaTraduccion(e, null);');
    // Mientras comprueba, el botón lleva el cargador de siempre (cargador.ts)
    expect(c).toContain('cargadores.correr(CLAVE_COMPROBAR_CUENTA');
    expect(f).toContain("import { contenidoDelBoton, corre, crearCargadores } from './cargador';");
    // Entrega con la traducción y la meta hallada; nunca deja una pregunta ni espera una segunda pulsación (nmws4p04wtit)
    expect(c).toContain('return conMetaDetectada(conLaTraduccion(e, c ?? null), decidirComprobacion(c ?? null).meta);');
    expect(f).not.toMatch(/preguntada|htmlPregunta|pregunta-cuenta|textarea\[name="respuesta"\]/);
    const clic = f.slice(f.indexOf("dlg.addEventListener('click'"), f.indexOf("dlg.addEventListener('submit'"));
    expect(clic).toMatch(/b\.dataset\.sinComprobar !== undefined && pendiente[\s\S]{0,600}const e = conLaTraduccion\(pendiente, null\);[\s\S]{0,300}await entregarYCerrar\(e\)/);
    const envio = f.slice(f.indexOf("dlg.addEventListener('submit'"), f.indexOf("dlg.addEventListener('cancel'"));
    expect(envio.match(/await conLaComprobacion\(/g)).toHaveLength(2);
    // La página trae la comprobación del servidor; cualquier fallo es null
    const app = readFileSync(new URL('./app.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
    expect(app).toContain('}, comprobarCuenta);');
    expect(app).toContain("fetch('/__estudio/director/comprobar-cuenta'");
    const api = readFileSync(new URL('../servidor/api.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
    expect(api).toContain("if (ruta === '/comprobar-cuenta' && req.method === 'POST')");
    // La meta hallada va a donde el diagnóstico guarda la que detecta: detectado.meta del plan, no proyecto.json (pd_diagnostico_llena)
    expect(api).toContain('plan.detectado = { ...(plan.detectado ?? {}), meta: x.metaDetectada };');
  });

  it('las frases de lo lento están en los dos idiomas, y las de la pregunta ya no existen (nmws4p04wtit)', () => {
    for (const k of ['nuevo.tardaMas', 'nuevo.entregarSinComprobar'] as const) {
      expect(es[k]).toBeTruthy();
      expect(en[k]).toBeTruthy();
    }
    for (const k of ['nuevo.faltaQueEs', 'nuevo.faltaMeta', 'nuevo.faltaLasDos', 'nuevo.sugerenciaMeta', 'nuevo.faltaRespuesta', 'nuevo.faltaPista']) {
      expect(es).not.toHaveProperty(k);
      expect(en).not.toHaveProperty(k);
    }
  });
});

describe('el formulario sigue abierto con lo escrito hasta que el servidor acepta la entrega (auditoría de la entrega, punto 1)', () => {
  const fuente = readFileSync(new URL('./nuevo_proyecto.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const app = readFileSync(new URL('./app.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');

  it('cada entrega del formulario pasa por el servidor antes de cerrarlo, y un rechazo se dice en el formulario', () => {
    const envio = fuente.slice(fuente.indexOf("dlg.addEventListener('submit'"), fuente.indexOf("dlg.addEventListener('cancel'"));
    expect(envio).not.toMatch(/return terminar\(/);
    // Los dos formularios del campo libre pasan antes por la comprobación (pd_campo_libre); el escaneo, directo
    expect(envio.match(/return void \(await entregarYCerrar\(/g)).toHaveLength(1);
    expect(envio.match(/return void \(e && \(await entregarYCerrar\(e\)\)\);/g)).toHaveLength(2);
    const cerrar = fuente.slice(fuente.indexOf('const entregarYCerrar = async'), fuente.indexOf('// ── Lo de siempre y uno nuevo'));
    // Cierra solo después de que el servidor dijo que sí; si dijo que no, el error queda en el formulario, que no se repinta
    expect(cerrar.indexOf('await entregar(r)')).toBeLessThan(cerrar.lastIndexOf('      terminar(r);\n'));
    expect(cerrar.indexOf('await entregar(r)')).toBeGreaterThan(cerrar.indexOf('if (!entregar) return terminar(r);'));
    expect(cerrar).toContain('if (fallo !== null) return error(fallo);');
    expect(cerrar).not.toMatch(/poner\(/);
  });

  it('la página manda la entrega desde el formulario y ya no después de cerrarlo', () => {
    const nuevo = app.slice(app.indexOf('async function nuevoProyecto'), app.indexOf('function pintarBienvenida'));
    expect(nuevo).toContain('j = await enviarEntrega(e);');
    expect(nuevo).not.toContain("fetch('/__estudio/director/proyecto-nuevo'");
    expect(nuevo).not.toContain("fetch('/__estudio/director/proyectos-varios'");
    expect(nuevo.indexOf('j = await enviarEntrega(e);')).toBeLessThan(nuevo.indexOf('if (!r) return;'));
  });
});

describe('una entrega que funcionó no parece fallida si después falla traerla a la página (auditoría de la entrega, punto 2)', () => {
  const app = readFileSync(new URL('./app.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const nuevo = app.slice(app.indexOf('async function nuevoProyecto'), app.indexOf('function pintarBienvenida'));

  it('tras el sí del servidor, ningún fallo dice «el servidor no responde»: dice que quedó entregado y cómo verlo', () => {
    const despues = nuevo.slice(nuevo.indexOf('if (!r) return;'), nuevo.indexOf('async function cargarTrasEntregar'));
    expect(despues).not.toContain('SIN_SERVIDOR()');
    expect(despues).not.toContain('await cargar(true);');
    expect(despues.match(/if \(!\(await cargarTrasEntregar\(nombres, diagnostico\)\)\) return;/g)).toHaveLength(1);
    expect(despues).toContain("avisar(tx(diagnostico ? 'nuevo.entregadoSinVerloNiDiagnostico' : 'nuevo.entregadoSinVerlo', { nombre: nombres }), false);");
    const cargarTras = nuevo.slice(nuevo.indexOf('async function cargarTrasEntregar'));
    expect(cargarTras).toMatch(/try \{\s+await cargar\(true\);\s+return true;\s+\} catch \{\s+avisar\(tx\(diagnostico \? 'nuevo\.entregadoSinVerloNiDiagnostico' : 'nuevo\.entregadoSinVerlo', \{ nombre \}\), false\);\s+return false;/);
  });
});

describe('un solo proyecto se entrega pidiendo su diagnóstico, por cualquier camino (pd_entrega_al_instante, nmwb73juxtit)', () => {
  it('el elegido del escaneo pide su diagnóstico y conserva lo que el escaneo encontró', () => {
    const historialIA = [{ agente: 'Claude Code', sesiones: 4 }];
    expect(entregaElegida({ nombre: 'IDG', ruta: 'C:/idg', historialIA })).toEqual({
      modo: 'uno', diagnosticar: true,
      datos: { tipo: 'existente', nombre: 'IDG', ruta: 'C:/idg', contexto: '', metaInicial: '', terminado: '', historialIA },
    });
    expect(entregaElegida({ nombre: 'IDG', ruta: 'C:/idg' })).toMatchObject({ modo: 'uno', diagnosticar: true, datos: { nombre: 'IDG' } });
  });

  it('el único botón de entregar pide el diagnóstico, en todos los formularios y en los dos idiomas (pd_entrega_fluida, nmwcw9ayjtit)', () => {
    ponerIdioma('en');
    expect(botonEntregar()).toContain('Deliver and request its diagnosis');
    expect(botonEntregar()).toContain('uses your Claude plan');
    expect(botonEntregar()).toContain('data-diagnostico');
    expect(htmlNuevo(false)).toContain('Deliver and request its diagnosis');
    // Lo de siempre ya no ofrece escribir varias carpetas: solo escanear o uno nuevo
    const rapido = htmlRapido(false);
    expect(rapido).not.toContain('data-tipo="existente"');
    expect(rapido).toContain('data-tipo="escanear"');
    expect(rapido).toContain('data-tipo="nuevo"');
    expect(rapido).not.toMatch(/Several at once|type their folders/);
    ponerIdioma('es');
    expect(botonEntregar()).toContain('Entregar y pedir su diagnóstico');
    expect(htmlNuevo(false)).toContain('Entregar y pedir su diagnóstico');
    expect(htmlRapido(false)).not.toMatch(/Varios a la vez|escribir sus carpetas/);
  });
});

describe('la lista del escaneo: lo que ya está en el Studio, en gris al final, y sin ninguno para entregar, el campo de la carpeta (nmwds6073tit, nmwds6m7gtit)', () => {
  const c = (nombre: string, yaEsta: boolean): Candidato => ({ nombre, ruta: `C:/www/${nombre}`, senales: [{ agente: 'Claude Code', sesiones: 2 }], ultima: null, yaEsta });

  it('los que ya están van al final, en gris, con «Already in the Studio» y sin poder elegirse; cada casilla conserva su índice', () => {
    ponerIdioma('en');
    const html = htmlEscaneo([c('viejo', true), c('nuevo', false)]);
    expect(html).toContain('data-form="escaneo"');
    expect(html.indexOf('C:/www/nuevo')).toBeLessThan(html.indexOf('C:/www/viejo'));
    const ya = html.slice(html.indexOf('<li class="ya"'), html.indexOf('</li>', html.indexOf('<li class="ya"')));
    expect(ya).toContain('aria-disabled="true"');
    expect(ya).toContain('<b>Already in the Studio.</b>');
    expect(ya).toMatch(/name="elegido" value="0" disabled/);
    expect(ya).toMatch(/name="nombre-0" value="viejo" disabled/);
    expect(html).toMatch(/name="elegido" value="1" checked/);
    expect(html).toContain('Deliver and request its diagnosis');
  });

  it('sin ninguno para entregar, una línea lo dice y el campo de la carpeta queda ahí, con el botón de siempre; los que ya están siguen en gris', () => {
    ponerIdioma('en');
    const html = htmlEscaneo([c('viejo', true)]);
    expect(html).toContain('data-form="rapido"');
    expect(html).toContain('I found no projects to hand over: type or browse for its folder here.');
    expect(html).toMatch(/<input name="ruta" type="text" required/);
    expect(html).toContain('data-explorar');
    expect(html).toContain('>Deliver and request its diagnosis</button>');
    expect(html).toContain('<li class="ya"');
    expect(html).not.toContain('data-todos');
    // Sin nada encontrado, igual: la línea y el campo, sin lista
    const vacio = htmlEscaneo([]);
    expect(vacio).toContain('I found no projects to hand over');
    expect(vacio).not.toContain('candidatos-e');
    ponerIdioma('es');
    expect(htmlEscaneo([])).toContain('No encontré proyectos para entregar');
  });

  it('al pintarla sin ninguno para entregar, el cursor queda en el campo de la carpeta', () => {
    const fuente = readFileSync(new URL('./nuevo_proyecto.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
    const escaneo = fuente.slice(fuente.indexOf('async function hacerEscaneo'), fuente.indexOf("dlg.addEventListener('click'"));
    expect(escaneo).toContain('poner(htmlEscaneo(candidatos, j));');
    expect(escaneo).toContain(`if (!candidatos.some((c) => !c.yaEsta)) dlg.querySelector<HTMLInputElement>('input[name="ruta"]')?.focus();`);
    // Los lugares van marcados: la carpeta personal y los habituales de código, nunca las unidades enteras
    expect(fuente).toContain('name="lugar" value="${esc(u)}" checked');
    expect(fuente).not.toContain('name="unidad"');
  });
});

describe('el escaneo al instante y un solo proyecto (nmwdxssn3tit, nmwdxt8uctit)', () => {
  const c = (nombre: string, yaEsta = false): Candidato => ({ nombre, ruta: `C:/www/${nombre}`, senales: [{ agente: 'Claude Code', sesiones: 2 }], ultima: null, yaEsta });
  const fuente = readFileSync(new URL('./nuevo_proyecto.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');

  it('con varios para entregar, cada fila se elige sola: radios sin ninguno marcado, sin «todos» y con un único «Deliver and request its diagnosis»', () => {
    ponerIdioma('en');
    const html = htmlEscaneo([c('uno'), c('dos'), c('viejo', true)]);
    expect(html.match(/type="radio" name="elegido"/g)).toHaveLength(3);
    expect(html).not.toContain('type="checkbox"');
    expect(html).not.toMatch(/name="elegido" value="\d" checked/);
    expect(html).not.toContain('data-todos');
    expect(html.match(/data-fila-candidato/g)).toHaveLength(2);
    expect(html.match(/type="submit"/g)).toHaveLength(1);
    expect(html).toContain('>Deliver and request its diagnosis</button>');
    expect(html).toContain('Click the one to hand over');
  });

  it('«Scan this computer» escanea sin la ventana de antes, con todo lo que existe marcado; «← Look somewhere else» lleva a los lugares', () => {
    expect(fuente).toContain("else if (b.dataset.tipo === 'escanear') await escanearYa();");
    const ya = fuente.slice(fuente.indexOf('async function escanearYa'), fuente.indexOf('async function escanear('));
    expect(ya).toContain("await escanear(f.agentes.filter((a) => a.existe).map((a) => a.id), f.lugares, t('nuevo.escaneandoYa'));");
    expect(fuente).toContain('else if (b.dataset.volverPermiso !== undefined) await permisoEscaneo();');
  });

  it('un clic en la fila la elige, y se entrega uno solo, pidiendo su diagnóstico', () => {
    expect(fuente).toMatch(/closest<HTMLElement>\('\[data-fila-candidato\]'\)[\s\S]{0,200}radio\.checked = true/);
    expect(entregaElegida({ nombre: 'uno', ruta: 'C:/www/uno' })).toMatchObject({ modo: 'uno', diagnosticar: true });
  });
});

describe('una carpeta dentro de un repositorio no se entrega como el repositorio entero sin que la persona lo elija (pd_auditoria_entrega, nmwdpftqatit)', () => {
  const api = readFileSync(new URL('../servidor/api.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const fuente = readFileSync(new URL('./nuevo_proyecto.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');

  it('distingue la raíz del repositorio de una carpeta dentro de él, con «\\» o «/», la barra final y, en Windows, sin mayúsculas', () => {
    expect(esSubcarpeta('C:\\www\\STL\\', 'C:/www/STL', true)).toBe(false);
    expect(esSubcarpeta('c:\\WWW\\stl', 'C:/www/STL', true)).toBe(false);
    expect(esSubcarpeta('"C:\\www\\STL"', 'C:/www/STL', true)).toBe(false);
    expect(esSubcarpeta('C:\\www\\STL\\estudio', 'C:/www/STL', true)).toBe(true);
    expect(esSubcarpeta('/home/yo/App', '/home/yo/app', false)).toBe(true);
    expect(esSubcarpeta('/home/yo/app/', '/home/yo/app', false)).toBe(false);
  });

  it('el servidor no registra una subcarpeta: responde con la raíz, antes de entregar, en su único camino', () => {
    const desde = api.indexOf("if (ruta === '/proyecto-nuevo'");
    const uno = api.slice(desde, api.indexOf("return responder(res, 200, { id });", desde));
    expect(uno).toContain("if (esSubcarpeta(rutaRepo, c.info.ruta)) return responder(res, 409, { error: t('servidor.api.esSubcarpeta', { repo: c.info.ruta }), subcarpeta: c.info.ruta });");
    expect(uno.indexOf('esSubcarpeta(rutaRepo')).toBeLessThan(uno.indexOf('await entregar('));
    // Un proyecto a la vez: la única entrada es «proyecto-nuevo» (pd_entrega_fluida, nmwcw9ayjtit)
    expect(api).not.toContain("'/proyectos-varios'");
  });

  it('una carpeta sin git recibe el suyo antes de comprobarla, sea cual sea el tipo, y un fallo dice la razón de git (nmws3cw72tit)', () => {
    const desde = api.indexOf("if (ruta === '/proyecto-nuevo'");
    const uno = api.slice(desde, api.indexOf("return responder(res, 200, { id });", desde));
    expect(uno).toContain('const inicio = await iniciarSiNoEsGit(rutaRepo);');
    expect(uno).not.toMatch(/tipo === 'nuevo' && existsSync\(rutaRepo\)/);
    expect(uno.indexOf('iniciarSiNoEsGit(rutaRepo)')).toBeLessThan(uno.indexOf('comprobarRepositorio(rutaRepo)'));
    expect(uno).toContain("t('servidor.api.gitNoInicio', { razon: inicio.razon })");
  });

  it('el servidor: sin nombre, el de la carpeta legible; uno que ya existe entra con el campo vacío, y uno nuevo solo pide lo contado (pd_campo_libre)', () => {
    const desde = api.indexOf("if (ruta === '/proyecto-nuevo'");
    const uno = api.slice(desde, api.indexOf("return responder(res, 200, { id });", desde));
    expect(uno).toContain("const nombre = textoDe(cuerpo.nombre, 120, t('servidor.api.etNombreProyecto')) || nombreLegible(rutaRepo);");
    expect(uno.indexOf('const rutaRepo')).toBeLessThan(uno.indexOf('const nombre'));
    expect(uno).toContain("if (tipo === 'nuevo' && !contexto)");
    expect(uno).not.toMatch(/tipo === 'existente' && !contexto/);
    expect(uno).not.toContain('!metaInicial');
    expect(api).toContain("import { nombreLegible } from '../src/nombreDeCarpeta.ts';");
  });

  it('el aviso dice de qué repositorio es parte, con «Hand over the whole repository» y «Choose another folder», en los dos idiomas', () => {
    ponerIdioma('en');
    const en = htmlSubcarpeta('C:/www/STL');
    expect(en).toContain('This folder is part of the repository <b class="ruta-mono">C:/www/STL</b>: I will hand over the whole repository.');
    expect(en).toContain('data-repo-entero>Hand over the whole repository</button>');
    expect(en).toContain('data-otra-carpeta>Choose another folder</button>');
    expect(htmlSubcarpeta('C:/a<b>')).toContain('C:/a&lt;b&gt;');
    ponerIdioma('es');
    expect(htmlSubcarpeta('C:/www/STL')).toContain('Entregar el repositorio entero');
    expect(htmlSubcarpeta('C:/www/STL')).toContain('Elegir otra carpeta');
  });

  it('entregar el repositorio entero manda la raíz; el nombre sacado de la subcarpeta toma el de la raíz y uno escrito se queda', () => {
    const rapido: Entrega = { modo: 'uno', diagnosticar: true, datos: datosDeRapido({ ruta: 'C:/www/STL/estudio', cuenta: 'Lo cuento' }) };
    expect(conRepositorioEntero(rapido, 'C:/www/STL')).toEqual({ modo: 'uno', diagnosticar: true, datos: { tipo: 'existente', nombre: 'STL', ruta: 'C:/www/STL', contexto: 'Lo cuento', metaInicial: '', terminado: '' } });
    const escrito: Entrega = { modo: 'uno', datos: { tipo: 'nuevo', nombre: 'Mi app', ruta: 'C:/www/STL/app', contexto: 'Qué es', metaInicial: 'Meta', terminado: '' } };
    expect(conRepositorioEntero(escrito, 'C:/www/STL')).toMatchObject({ datos: { nombre: 'Mi app', ruta: 'C:/www/STL' } });
  });

  it('el formulario muestra el aviso en lugar del error y solo entrega la raíz con su botón', () => {
    const cerrar = fuente.slice(fuente.indexOf('const entregarYCerrar = async'), fuente.indexOf('// ── Lo de siempre y uno nuevo'));
    expect(cerrar).toContain("insertAdjacentHTML('afterend', htmlSubcarpeta(fallo.subcarpeta))");
    expect(cerrar.indexOf('htmlSubcarpeta(fallo.subcarpeta)')).toBeLessThan(cerrar.indexOf('if (fallo !== null) return error(fallo);'));
    const clic = fuente.slice(fuente.indexOf("dlg.addEventListener('click'"), fuente.indexOf("dlg.addEventListener('submit'"));
    expect(clic).toContain('await entregarYCerrar(conRepositorioEntero(entrega, repo))');
    expect(clic.indexOf('conRepositorioEntero(')).toBeGreaterThan(clic.indexOf('b.dataset.repoEntero !== undefined && porSubcarpeta'));
  });
});

// En una instalación nueva (Ubuntu, nota de voz del titular nmwr9x0dptit), la prueba del micrófono del asistente
// transcribía y el formulario de entrega del PRIMER proyecto no: su «Grabar» va a «/dictar», que estaba después de la
// puerta «aún no hay proyectos» (409) y además pedía un rol (403). Sin proyecto activo, nunca llegaba a transcribir
describe('el formulario de entrega del primer proyecto transcribe sin proyecto activo, como la prueba del micrófono (nmwr9x0dptit)', () => {
  const api = readFileSync('estudio/servidor/api.ts', 'utf8');
  const app = readFileSync('estudio/src/app.ts', 'utf8');
  const rutaDictar = api.indexOf("if (ruta === '/dictar' && req.method === 'POST')");
  const puertaSinProyecto = api.indexOf("if (!id) return responder(res, 409, { error: t('servidor.api.sinProyectos') });");
  const dictarSrv = api.slice(rutaDictar, api.indexOf("ruta === '/lectura'", rutaDictar));
  const pruebaMic = api.slice(api.indexOf("ruta === '/asistente/prueba-mic'"), api.indexOf("ruta === '/idioma'"));

  it('«/dictar» va antes de la puerta que exige un proyecto activo', () => {
    expect(rutaDictar).toBeGreaterThan(-1);
    expect(puertaSinProyecto).toBeGreaterThan(-1);
    expect(rutaDictar).toBeLessThan(puertaSinProyecto);
  });

  it('no pide un rol ni un proyecto: el nombre es solo para la bitácora, y sin proyecto no cuenta notas en curso', () => {
    expect(dictarSrv).not.toMatch(/yo\.rol|responder\(res, 403/);
    expect(dictarSrv).toContain('const soltar = id ? notasEnCurso.empieza(id) : () => {};');
    expect(dictarSrv).toContain('...(id ? { proyecto: id } : {})');
  });

  // nmws1h8yhtit: un solo camino para los dos (formato, carpeta, motor y razón), para que no vuelvan a separarse
  it('transcribe con la misma función que la prueba del micrófono del asistente', () => {
    expect(pruebaMic).toContain("transcribirGrabado(raiz, 'p', cuerpo.audio");
    expect(dictarSrv).toContain("transcribirGrabado(raiz, 'd', cuerpo.audio");
    expect(pruebaMic).not.toMatch(/guardarAudio|transcribirEnLocal/);
    expect(dictarSrv).not.toMatch(/guardarAudio|transcribirEnLocal/);
    const funcion = api.slice(api.indexOf('async function transcribirGrabado('), api.indexOf('const TIPOS_AUDIO'));
    expect(funcion).toContain("guardarAudio(raiz, '.estudio/dictados'");
    expect(funcion).toContain('transcribirEnLocal(raiz, [audio], contexto)');
    expect(funcion).toContain('transcripcionEnDisco(audio)');
  });

  it('la razón del fallo llega a la página, también la de un audio que no se pudo guardar', () => {
    expect(dictarSrv).toContain('return responder(res, 400, { error: g.error });');
    expect(dictarSrv).toContain('e instanceof Rechazo ? 400 : 500, { error: (e as Error).message }');
  });

  it('la página le pasa al formulario esa misma ruta, con la razón', () => {
    expect(app).toContain('pedirProyectoNuevo((audio) => dictarConRazon(audio, true)');
    expect(app).toContain("fetch('/__estudio/director/dictar'");
    expect(app).toContain("return { error: typeof c.error === 'string' ? c.error : '' };");
  });
});

describe('la entrega nunca se detiene a preguntar: ni «¿Qué es?» (nmws1o6yltit) ni «¿A dónde lo quieres llevar?» (nmws4p04wtit)', () => {
  it('si la comprobación solo echa en falta qué es, entrega al instante, sin pregunta', () => {
    expect(decidirComprobacion({ falta: ['que'] })).toEqual({ accion: 'entregar' });
    expect(decidirComprobacion({ falta: ['que'], meta: 'que reserven en línea' })).toEqual({ accion: 'entregar', meta: 'que reserven en línea' });
  });
  it('un texto que no dice nada de la meta entrega igual, directo: la meta se fija después del diagnóstico, en «Tu meta»', () => {
    for (const falta of [['que'], ['meta'], ['que', 'meta'], ['meta', 'que']] as ('que' | 'meta')[][]) {
      expect(decidirComprobacion({ falta })).toEqual({ accion: 'entregar' });
    }
    expect(decidirComprobacion({ falta: ['meta'], meta: '  ' })).toEqual({ accion: 'entregar' });
  });
});

describe('un dictado que no transcribe dice la razón del servidor en el formulario (nmws1h8yhtit)', () => {
  it('con razón, la muestra después de «No se pudo transcribir»; sin ella, el aviso de siempre', () => {
    ponerIdioma('en');
    expect(avisoSinTranscribir('It could not be transcribed on this computer (python3 was not found).')).toBe('What you said could not be transcribed. The reason: It could not be transcribed on this computer (python3 was not found). Try again, or write it.');
    expect(avisoSinTranscribir('the Studio did not answer')).toContain('The reason: the Studio did not answer. Try again');
    expect(avisoSinTranscribir('')).toBe(en['nuevo.noTranscribio']);
    expect(avisoSinTranscribir(null)).toBe(en['nuevo.noTranscribio']);
    ponerIdioma('es');
    expect(avisoSinTranscribir('Falta Python.')).toBe('No se pudo transcribir lo que dijiste. La razón: Falta Python. Inténtalo otra vez, o escríbelo.');
  });

  it('lee lo que devuelve el dictado: texto, razón o nada', () => {
    expect(leerDictado({ texto: 'hola' })).toEqual({ texto: 'hola', razon: '' });
    expect(leerDictado('hola')).toEqual({ texto: 'hola', razon: '' });
    expect(leerDictado({ error: 'sin Python' })).toEqual({ texto: null, razon: 'sin Python' });
    expect(leerDictado(null)).toEqual({ texto: null, razon: '' });
  });

  it('el campo arma su aviso con esa razón', () => {
    const fuente = readFileSync(new URL('./nuevo_proyecto.ts', import.meta.url), 'utf8');
    expect(fuente).toContain('armarDictado(caja, texto ? undefined : avisoSinTranscribir(razon));');
    expect(fuente).not.toContain("armarDictado(caja, texto ? undefined : t('nuevo.noTranscribio'))");
  });
});
