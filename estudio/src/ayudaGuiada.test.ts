import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { debeOfrecerse, estadoDelAtajoAyuda, globoDeGuiaHtml, PARTES_HOY, partesALaVista, repetirHtml, SECCIONES, seccionDeVista, textoDeParte } from './ayudaGuiada';
import { crearEsperaDelTitulo, ESPERA_DEL_TITULO } from './globoDeTitulos';
import { ponerIdioma } from './textos';

const leer = (...r: string[]) => readFileSync(join(__dirname, ...r), 'utf-8');

describe('el modo ayuda manda (nmw6rjf3utit, nmw6rw57ntit, nmw6qfcbltit, nmw6s6bpctit)', () => {
  it('con el modo ayuda apagado, ninguna vista empieza un recorrido', () => {
    for (const vista of ['misiones', 'buzon', 'documentos', 'ruta', 'modelo']) {
      expect(debeOfrecerse({ vista, vistas: [], revisando: false, hayAlgo: true, ayuda: false })).toBe(false);
      expect(debeOfrecerse({ vista, vistas: [], revisando: false, hayAlgo: true, ayuda: true })).toBe(true);
    }
    const codigo = leer('ayudaGuiada.ts');
    // Ni el «Ver otra vez» ni nada más empieza uno sin el modo encendido, y apagarlo cierra el que se ve
    expect(codigo).toContain('if (!modo) return; // sin el modo ayuda encendido, ningún recorrido');
    expect(codigo).toContain('if (!modo && guia) terminarGuia();');
    expect(leer('app.ts')).toContain('ayuda: modoAyuda() })) empezarGuia');
  });

  it('el círculo del modo ayuda y la cara del director quedan encima de la capa del recorrido, para apagarlo con un clic', () => {
    const css = leer('estilos.css');
    expect(css).toContain('html body:has([data-guia-capa]) :is(.atajos-director, .director-flotante) { z-index: 2100; }');
    // La capa del recorrido está en 2000: los círculos, por encima
    expect(css).toContain('.capa-guia { position: fixed; inset: 0; z-index: 2000; }');
    // El clic en el círculo se atiende antes que cualquier botón del recorrido
    const codigo = leer('ayudaGuiada.ts');
    expect(codigo.indexOf("closest('[data-modo-ayuda]')")).toBeLessThan(codigo.indexOf("closest('[data-guia-saltar]')"));
  });

  it('encendido, el círculo del modo ayuda tiene el fondo rojo', () => {
    expect(leer('estilos.css')).toContain('.atajo.atajo-ayuda.activo { background: #c62828; color: #fff; }');
    expect(leer('ayudaGuiada.ts')).toContain("b.classList.toggle('activo', modo);");
  });

  it('el globo de los títulos sale solo tras dos segundos quieto sobre el mismo elemento, y en la capa de arriba', () => {
    vi.useFakeTimers();
    try {
      const vistos: Element[] = [];
      const espera = crearEsperaDelTitulo((el) => vistos.push(el));
      const a = {} as Element;
      const b = {} as Element;
      expect(ESPERA_DEL_TITULO).toBe(2000);
      // Moverse sin parar: nada
      espera.mover(a); vi.advanceTimersByTime(1500);
      espera.mover(a); vi.advanceTimersByTime(1500);
      espera.mover(b); vi.advanceTimersByTime(1999);
      expect(vistos).toEqual([]);
      // Quieto dos segundos sobre el mismo: su globo
      vi.advanceTimersByTime(1);
      expect(vistos).toEqual([b]);
      // Salir antes de tiempo no muestra nada
      espera.mover(a); vi.advanceTimersByTime(1000); espera.cancelar(); vi.advanceTimersByTime(5000);
      expect(vistos).toEqual([b]);
      expect(espera.contando()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
    const codigo = leer('globoDeTitulos.ts');
    // En la capa de arriba (popover), así queda sobre la ventana de la línea en grande
    expect(codigo).toContain("g.setAttribute('popover', 'manual');");
    expect(codigo).toContain('g.showPopover();');
    expect(codigo).toContain("document.addEventListener('mousemove', alMover, true);");
    expect(leer('estilos.css')).toContain('.globo-modo[data-globo-titulo][popover] { inset: auto; margin: 0; overflow: visible; }');
  });
});

describe('la ayuda guiada de «Hoy» (pd_ayuda_guiada)', () => {
  afterEach(() => ponerIdioma('es'));

  it('lleva cinco globos, en su orden: la misión, los botones del paso, «Lo que sigue», el ✉ y «Pedir revisión» (nmw5725pttit)', () => {
    expect(PARTES_HOY.map((p) => p.id)).toEqual(['mision', 'botones', 'sigue', 'nota', 'revision']);
    expect(textoDeParte('mision')).toBe('Lo único que tienes que hacer ahora. Su paso de ahora va abierto, con su botón al lugar exacto.');
    expect(textoDeParte('revision')).toContain('responde cada nota');
  });

  it('cada globo trae «Siguiente», «Saltar la ayuda» y su cuenta, «2 de 5»; el último, «Terminar» (nmw3y0jw7tit, nmw41ktn7tit)', () => {
    const dos = globoDeGuiaHtml('botones', 1, 5);
    expect(dos).toContain('data-guia-siguiente>Siguiente<');
    expect(dos).toContain('data-guia-saltar>Saltar la ayuda<');
    expect(dos).toContain('>2 de 5<');
    expect(globoDeGuiaHtml('revision', 4, 5)).toContain('data-guia-siguiente>Terminar<');
  });

  it('en inglés también, desde la primera versión (nmw47psdftit)', () => {
    ponerIdioma('en');
    const html = globoDeGuiaHtml('sigue', 2, 5);
    expect(html).toContain('>Next<');
    expect(html).toContain('>Skip the help<');
    expect(html).toContain('>3 of 5<');
    expect(html).toContain('done one at a time');
    expect(estadoDelAtajoAyuda(false).etiqueta).toBe('Help mode: off');
    expect(estadoDelAtajoAyuda(true).etiqueta).toBe('Help mode: on');
  });

  it('se ofrece una vez por sección, con algo a la vista y sin el director revisando (nmw3q68j8tit, nmw2qqxi5tit, nmw3s4y67tit, nmw10lshztit)', () => {
    const base = { vista: 'misiones', vistas: [] as string[], revisando: false, hayAlgo: true, ayuda: true };
    expect(debeOfrecerse(base)).toBe(true);
    expect(debeOfrecerse({ ...base, vistas: ['hoy'] })).toBe(false);
    expect(debeOfrecerse({ ...base, revisando: true })).toBe(false);
    expect(debeOfrecerse({ ...base, hayAlgo: false })).toBe(false);
    // Cada sección, la primera vez que se abre
    expect(debeOfrecerse({ ...base, vista: 'buzon', vistas: ['hoy'] })).toBe(true);
    expect(debeOfrecerse({ ...base, vista: 'buzon', vistas: ['hoy', 'buzon'] })).toBe(false);
    expect(debeOfrecerse({ ...base, vista: 'documentos', vistas: ['hoy', 'buzon'] })).toBe(true);
    expect(debeOfrecerse({ ...base, vista: 'ruta' })).toBe(true);
    expect(debeOfrecerse({ ...base, vista: 'ruta', vistas: ['ruta'] })).toBe(false);
    expect(debeOfrecerse({ ...base, vista: 'modelo' })).toBe(true);
    expect(debeOfrecerse({ ...base, vista: 'modelo', vistas: ['modelo'] })).toBe(false);
  });

  it('solo señala lo que está en la pantalla, sin saltarse el orden', () => {
    expect(partesALaVista((s) => s !== '.cola-m')).toEqual(['mision', 'botones', 'nota', 'revision']);
    expect(partesALaVista((s) => s !== '.botones-decision', 'documentos')).toEqual(['columna', 'entendido', 'comentar']);
  });

  it('Esc la salta, y un clic fuera del globo no hace nada (nmw41kk8jtit)', () => {
    const codigo = leer('ayudaGuiada.ts');
    expect(codigo).toContain("if (e.key === 'Escape' && guia) { e.preventDefault(); terminarGuia(); }");
    // El clic solo atiende los botones del globo; la capa cubre la pantalla y no cierra nada
    expect(leer('estilos.css')).toContain('.capa-guia { position: fixed; inset: 0; z-index: 2000; }');
    // Que ya se vio lo recuerda el Studio, no el navegador
    expect(leer('app.ts')).toContain('empezarGuia(seccion, () => void ayudaVista(seccion))');
    expect(leer('app.ts')).toContain("fetch('/__estudio/director/ayuda-vista'");
    expect(leer('..', 'servidor', 'api.ts')).toContain("ruta === '/ayuda-vista'");
  });
});

describe('el botón «Ayuda» y el modo ayuda (nmw5ggnfdtit, nmw5irt7vtit, nmw5irbo3tit)', () => {
  it('es un círculo más entre los del director, junto al de «Comentario», siempre a la vista también en el enfoque, y su ícono dice si está encendida (nmw6p8kjztit)', () => {
    // Ya no va en la cabecera
    expect(leer('app.ts')).not.toContain('botonAyudaHtml');
    expect(leer('app.ts')).toContain('<div class="acciones-cabeza">${botonRevision()}${((nv) =>');
    // En la columna del director, justo antes de «Comentario», sin «hidden»: ni el enfoque ni otra cosa lo esconden
    const atajos = leer('..', '..', 'index.html').match(/<div class="atajos-director"[\s\S]*?<\/div>/)?.[0] ?? '';
    const ayuda = atajos.match(/<button[^>]*data-modo-ayuda[^>]*>/)?.[0] ?? '';
    expect(ayuda).toContain('class="atajo atajo-ayuda"');
    expect(ayuda).not.toContain('hidden');
    expect(atajos.indexOf('data-modo-ayuda')).toBeLessThan(atajos.indexOf('data-escribir'));
    expect(atajos.indexOf('data-modo-ayuda')).toBeGreaterThan(atajos.indexOf('data-niebla'));
    const codigo = leer('ayudaGuiada.ts');
    expect(codigo).toContain('b.hidden = false;');
    expect(codigo).toContain("b.classList.toggle('activo', modo);");
    // Encendida y apagada: su nombre, su título y su ícono (apagada, cruzado por una raya)
    const apagado = estadoDelAtajoAyuda(false), encendido = estadoDelAtajoAyuda(true);
    expect(apagado.etiqueta).toBe('Modo ayuda: apagado');
    expect(encendido.etiqueta).toBe('Modo ayuda: encendido');
    expect(apagado.icono).toContain('class="raya-apagado"');
    expect(encendido.icono).not.toContain('raya-apagado');
    // Un «?» dentro de un globo, no el salvavidas (nmw6u6ikqtit): el globo lo distingue del «?» suelto del glosario
    for (const i of [apagado.icono, encendido.icono]) {
      expect(i).toContain('class="signo-pregunta"');
      expect(i).toContain('class="punto-pregunta"');
      expect(i).not.toContain('r="4"');
    }
    expect(encendido.titulo).toContain('Un clic lo apaga');
    expect(leer('estilos.css')).toContain('.atajo.activo { background: var(--acento);');
    // Se repinta al cambiar el modo y tras cada pintada (el idioma puede cambiar)
    expect(codigo).toMatch(/if \(!modo\) explicar\(null, null\);\n {2}pintarAtajoAyuda\(\);/);
    expect(leer('app.ts')).toContain('function alPintarAyuda() {\n  // El círculo del modo ayuda, en el idioma de ahora (cambia con «ES · EN» sin recargar)\n  pintarAtajoAyuda();');
  });

  it('explica una parte a la vez, al pasar el ratón, y arriba de «Hoy» trae «Ver otra vez el recorrido de esta sección» (nmw33ogfhtit)', () => {
    const codigo = leer('ayudaGuiada.ts');
    expect(codigo).toContain("document.addEventListener('mouseover'");
    expect(codigo).toContain('if (parte !== parteBajo) explicar(parte, textoDeParte(p.id, seccion));');
    expect(repetirHtml()).toContain('Ver otra vez el recorrido de esta sección');
    expect(leer('app.ts')).toContain("if (seccionDeVista(vista) && modoAyuda()) v.insertAdjacentHTML('afterbegin', repetirHtml());");
  });

  it('en «Hoy» explica siete partes: las cinco del recorrido, «¿Dónde quedamos?» y la línea del proyecto (nmw5mko9dtit)', () => {
    expect(SECCIONES.hoy.modo.map((p) => p.id)).toEqual(['mision', 'botones', 'sigue', 'nota', 'revision', 'quedamos', 'linea']);
    expect(SECCIONES.hoy.recorrido).toHaveLength(5);
    expect(textoDeParte('quedamos')).toBe('Lo que avanzamos y dónde quedó el proyecto, con lo nuevo desde tu última visita.');
    expect(textoDeParte('linea')).toBe('Cada revisión en el tiempo, como una carita: pasa el ratón para verla, y la lupa la abre en grande.');
  });
});

describe('la ayuda del Buzón y la de los documentos (nmw5mkwrhtit, nmw5mkyrktit, nmw5mk3vdtit)', () => {
  afterEach(() => ponerIdioma('es'));

  it('cuatro globos cada una, con los textos aprobados, en español y en inglés', () => {
    expect(SECCIONES.buzon.recorrido.map((p) => p.id)).toEqual(['lista', 'filtros', 'buscar', 'sinLeer']);
    expect(SECCIONES.documentos.recorrido.map((p) => p.id)).toEqual(['columna', 'entendido', 'decidir', 'comentar']);
    expect(textoDeParte('buscar', 'buzon')).toBe('Busca en tus notas mientras escribes, sin distinguir tildes ni mayúsculas.');
    expect(textoDeParte('entendido', 'documentos')).toBe('Cada documento se lee una idea a la vez: «Entendido» marca la que leíste y abre la siguiente.');
    expect(globoDeGuiaHtml('lista', 0, 4, 'buzon')).toContain('>1 de 4<');
    ponerIdioma('en');
    for (const s of ['buzon', 'documentos'] as const) {
      for (const p of SECCIONES[s].recorrido) expect(textoDeParte(p.id, s)).toMatch(/^[A-Z].+\.$/);
    }
    expect(textoDeParte('lista', 'buzon')).toContain('newest first');
  });

  it('solo señala lo que se ve: lo plegado (las ya respondidas del Buzón) existe pero no lleva globo', () => {
    const codigo = leer('ayudaGuiada.ts');
    expect(codigo).toContain('.find((e) => e.getClientRects().length > 0)');
    expect(codigo).toContain('const partes = partesALaVista((s) => !!aLaVista(s), seccion);');
    expect(codigo).toContain('const el = aLaVista(selectorDe(guia.seccion, id));');
    expect(leer('app.ts')).toContain('hayAlgo: !!aLaVista(SECCIONES[seccion].espera)');
  });

  it('cada vista lleva su sección, y el servidor las recuerda', () => {
    expect(seccionDeVista('misiones')).toBe('hoy');
    expect(seccionDeVista('buzon')).toBe('buzon');
    expect(seccionDeVista('documentos')).toBe('documentos');
    expect(seccionDeVista('ruta')).toBe('ruta');
    expect(seccionDeVista('modelo')).toBe('modelo');
    expect(seccionDeVista('proyecto')).toBeNull();
    expect(leer('..', '..', 'src', 'director', 'proyectos.ts')).toContain("SECCIONES_DE_AYUDA = ['hoy', 'buzon', 'documentos', 'ruta', 'modelo']");
  });

  it('el globo del recorrido resalta: borde grueso de acento, un pulso suave solo al aparecer (nmw5o6zn5tit) que se apaga con movimiento reducido, y lo demás más oscuro (nmw5m5v8otit)', () => {
    const css = leer('estilos.css');
    expect(css).toMatch(/\.globo-guia \{[^}]*border: 3px solid var\(--acento\);[^}]*animation: pulso-guia 1\.2s ease-in-out 2;/);
    expect(css).not.toMatch(/animation: pulso-guia[^;]*infinite/);
    // cada paso crea su globo de nuevo, así el pulso suena al aparecer cada uno y después queda quieto
    expect(leer('ayudaGuiada.ts')).toContain('capa.innerHTML = `<div class="hueco-guia" aria-hidden="true"></div>${globoDeGuiaHtml(');
    expect(css).toContain('@media (prefers-reduced-motion: reduce) { .globo-guia { animation: none; } }');
    expect(css).toMatch(/\.hueco-guia \{[^}]*0 0 0 9999px rgb\(0 0 0 \/ \.58\)/);
  });
});

describe('la ayuda de «La ruta» y la de «Modelo y consumo» (pd_ayuda_guiada)', () => {
  afterEach(() => ponerIdioma('es'));

  it('cuatro globos la ruta y tres «Modelo y consumo», con los textos aprobados y sus cuentas', () => {
    expect(SECCIONES.ruta.recorrido.map((p) => p.id)).toEqual(['fases', 'puerta', 'pedidos', 'pasadas']);
    expect(SECCIONES.modelo.recorrido.map((p) => p.id)).toEqual(['director', 'permisos', 'consumo']);
    expect(textoDeParte('puerta', 'ruta')).toBe('Lo que debe estar al 100 % para pasar a la fase siguiente. Solo tú la cruzas.');
    expect(textoDeParte('consumo', 'modelo')).toBe('Los tokens y la parte aproximada de tu plan que usó cada revisión, nunca en dinero.');
    expect(globoDeGuiaHtml('puerta', 1, 4, 'ruta')).toContain('>2 de 4<');
    expect(globoDeGuiaHtml('permisos', 1, 3, 'modelo')).toContain('>2 de 3<');
    expect(partesALaVista((s) => s !== '.puerta', 'ruta')).toEqual(['fases', 'pedidos', 'pasadas']);
    ponerIdioma('en');
    for (const s of ['ruta', 'modelo'] as const) {
      for (const p of SECCIONES[s].recorrido) expect(textoDeParte(p.id, s)).toMatch(/^[A-Z].+.$/);
    }
    expect(textoDeParte('pasadas', 'ruta')).toContain('the director already approved');
    expect(globoDeGuiaHtml('consumo', 2, 3, 'modelo')).toContain('>3 of 3<');
  });
});
