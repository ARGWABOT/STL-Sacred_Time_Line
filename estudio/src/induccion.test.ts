import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BURBUJAS, burbujaHtml, burbujasAlEncenderLaNube, debeAbrirVentana, debenSalirBurbujas, lugarDeBurbuja, PAGINAS, paginaSiguiente, RATON, repetirInduccionHtml, ventanaHtml } from './induccion';
import { en } from './textos/en';
import { es } from './textos/es';

const leer = (f: string) => readFileSync(join(__dirname, f), 'utf8').replace(/\r\n/g, '\n');
const codigo = leer('induccion.ts');
const recta = (left: number, top: number, width: number, height: number) => ({ left, top, width, height, right: left + width, bottom: top + height });

describe('la ventana de bienvenida (pd_induccion_niebla)', () => {
  it('se abre una vez, solo en «Hoy» con la misión a la vista y sin otra capa encima (nmwmnt1pbtit)', () => {
    const base = { vista: 'misiones', conMision: true, vista_: false, abierta: false, otraCapa: false };
    expect(debeAbrirVentana(base)).toBe(true);
    expect(debeAbrirVentana({ ...base, vista: 'buzon' })).toBe(false);
    expect(debeAbrirVentana({ ...base, vista: 'documentos' })).toBe(false);
    expect(debeAbrirVentana({ ...base, conMision: false })).toBe(false);
    expect(debeAbrirVentana({ ...base, vista_: true })).toBe(false);
    expect(debeAbrirVentana({ ...base, abierta: true })).toBe(false);
    expect(debeAbrirVentana({ ...base, otraCapa: true })).toBe(false);
  });

  it('tres páginas con las palabras aprobadas, cada una con su ratón, «Saltar» y la cuenta; la última dice «Listo» (nmwmevyx8tit, nmwmgrzh6tit, nmwdieo4ytit)', () => {
    expect(PAGINAS).toHaveLength(3);
    expect(PAGINAS.map((p) => en[p as keyof typeof en])).toEqual([
      'Pressing your mouse wheel is the Studio\'s next.',
      'On a step, a reading or a decision, it takes you to what comes next.',
      'Under the reading fog, it first uncovers the line and reads it to you; press it again to go on.',
    ]);
    expect([0, 1, 2].map(paginaSiguiente)).toEqual([1, 2, null]);
    for (const i of [0, 1, 2]) {
      const html = ventanaHtml(i);
      expect(html).toContain(RATON);
      expect(html).toContain('data-induccion-saltar');
      expect(html).toContain('data-induccion-siguiente');
    }
    expect(RATON).toContain('class="ind-rueda"');
    expect(leer('guiaLectura.css')).toMatch(/\.ind-raton \.ind-rueda \{ fill: #e8b931;/);
  });

  it('es silenciosa: no llama a la voz ni a la narración (nmwmrrq4atit)', () => {
    const ventana = codigo.slice(codigo.indexOf('function pintarVentana('), codigo.indexOf('function pintarBurbuja('));
    expect(ventana).not.toMatch(/escuchar|oirVoz|hablar|NARRAR/);
  });

  it('dejada a medias vuelve a empezar desde su primera página; cuenta como vista solo al terminar o con «Saltar» (nmwmrrzlytit)', () => {
    // La página no se guarda: siempre abre en la 0
    expect(codigo).not.toMatch(/setItem\([^)]*pagina/);
    expect(codigo).toContain('    pagina = 0;\n    return pintarVentana();');
    // Lo visto se marca solo en cerrarVentana(true): al pasar de la última o con «Saltar»
    expect(codigo.match(/marcar\(CLAVE_VENTANA, true\)/g)).toHaveLength(1);
    expect(codigo).toContain('if (sigue === null) return cerrarVentana(true);');
    expect(codigo).toContain("if (b.closest('[data-induccion-saltar]')) return cerrarVentana(true);");
  });

  it('el botón central y «→» la pasan, antes que la niebla y que siguiente.ts (nmwb4butvtit, nmwgu7montit)', () => {
    expect(codigo).toContain("addEventListener('mousedown', central, true);");
    // También las tres burbujas de la niebla: el central pasa a la siguiente y la niebla de detrás no lo ve (nmwnnelg2tit)
    const central = codigo.match(/const central = \(e: MouseEvent\) => \{[\s\S]*?\n {2}\};/)?.[0] ?? '';
    expect(central).toContain('if ((pagina === null && burbujas === null) || e.button !== 1) return;');
    expect(central).toContain('else siguienteBurbuja();');
    expect(central).toContain('e.stopImmediatePropagation();'); 
    expect(codigo).toContain("if (e.key === 'ArrowRight') {");
    expect(codigo).toContain('e.stopImmediatePropagation();');
  });

  it('«Saltar» cierra solo la ventana: las burbujas siguen esperando su primera vez (nmwmnsrsftit)', () => {
    const cerrar = codigo.match(/function cerrarVentana\([\s\S]*?\n\}/)?.[0] ?? '';
    expect(cerrar).not.toContain('CLAVE_BURBUJAS');
    expect(cerrar).toContain('quizaBurbujas()');
  });

  it('app.ts la pide después de pintar cada sección, tras la ayuda guiada', () => {
    const app = leer('app.ts');
    expect(app).toContain('requestAnimationFrame(() => { if (d?.identidad.rol) quizaInduccion(vista); });');
    expect(app.indexOf('requestAnimationFrame(alPintarAyuda);')).toBeLessThan(app.indexOf('quizaInduccion(vista); });'));
  });
});

describe('las tres burbujas (pd_induccion_niebla)', () => {
  it('salen ya vista la ventana, con la niebla puesta y sus controles a la vista, la primera vez (nmwb4b79htit, nmwl4y3lqtit)', () => {
    const base = { ayuda: true, ventanaVista: true, burbujasVistas: false, repetir: false, niebla: true, aLaVista: 3, abiertas: false };
    expect(debenSalirBurbujas(base)).toBe(true);
    expect(debenSalirBurbujas({ ...base, ventanaVista: false })).toBe(false);
    expect(debenSalirBurbujas({ ...base, burbujasVistas: true })).toBe(false);
    expect(debenSalirBurbujas({ ...base, burbujasVistas: true, repetir: true })).toBe(true);
    expect(debenSalirBurbujas({ ...base, niebla: false })).toBe(false);
    expect(debenSalirBurbujas({ ...base, aLaVista: 0 })).toBe(false);
    expect(debenSalirBurbujas({ ...base, abiertas: true })).toBe(false);
  });

  it('con «Modo ayuda» apagado, ninguna burbuja sale: ni la primera vez ni pedida otra vez (nmwmwkh9otit)', () => {
    const base = { ayuda: false, ventanaVista: true, burbujasVistas: false, repetir: false, niebla: true, aLaVista: 3, abiertas: false };
    expect(debenSalirBurbujas(base)).toBe(false);
    expect(debenSalirBurbujas({ ...base, repetir: true })).toBe(false);
    expect(debenSalirBurbujas({ ...base, ayuda: true })).toBe(true);
    // quizaBurbujas le pregunta al modo ayuda cada vez, y app.ts se lo da
    expect(codigo).toContain('if (!debenSalirBurbujas({ ayuda: deps.ayuda(),');
    expect(leer('app.ts')).toContain('ayuda: () => modoAyuda(),');
  });

  it('cada una junto a su control, con las palabras aprobadas, «Siguiente» y «Saltar todo»; sin «Escuchar» (nmwmevmeitit, nmwdie2jetit, nmwnnsrpwtit)', () => {
    expect(BURBUJAS.map((b) => b.selector)).toEqual(['[data-niebla]', '[data-niebla-auto]', '[data-niebla-voz]']);
    expect(BURBUJAS.map((b) => en[b.texto])).toEqual([
      'The middle button of your mouse uncovers the next line and reads it to you. Press it again to go on.',
      '▶ goes on by itself, at the speed you choose. Press it again to pause.',
      'The voice reads aloud here, on your computer: turn on the fog and press the middle button to hear it.',
    ]);
    const voz = burbujaHtml('voz', 2, 3);
    expect(voz).not.toContain('data-induccion-escuchar');
    expect(voz).toContain('data-induccion-saltar-todo');
    expect(voz).toContain('>Listo<');
    const niebla = burbujaHtml('niebla', 0, 3);
    expect(niebla).not.toContain('data-induccion-escuchar');
    expect(niebla).toContain('data-induccion-siguiente-burbuja');
  });

  it('nunca sobre el texto que se lee: va al lado libre junto a su control', () => {
    const ventana = { ancho: 1440, alto: 900 };
    const control = recta(700, 100, 32, 32);
    const globo = { ancho: 300, alto: 120 };
    // Sin texto cerca, a la derecha del control
    expect(lugarDeBurbuja(control, globo, ventana, []).lado).toBe('derecha');
    // Texto a la derecha: a la izquierda
    expect(lugarDeBurbuja(control, globo, ventana, [recta(740, 60, 600, 400)]).lado).toBe('izquierda');
    // Texto a los dos lados y debajo: arriba, si cabe
    const alto = recta(700, 400, 32, 32);
    expect(lugarDeBurbuja(alto, globo, ventana, [recta(740, 395, 600, 60), recta(0, 395, 690, 60), recta(0, 440, 1440, 400)]).lado).toBe('arriba');
  });

  it('el camino del titular: «Modo ayuda» puesto, el modo enfoque, la nube apagada y encendida otra vez: salen (nmwn1a7tltit, nmwn1e0gdtit)', () => {
    // Ya se habían gastado («vistas»), y antes no volvían a salir sin «Ver otra vez la introducción»
    const camino = { ayuda: true, ventanaVista: true, burbujasVistas: true, aLaVista: 3, abiertas: false };
    expect(debenSalirBurbujas({ ...camino, repetir: false, niebla: true })).toBe(false);
    // Apagar la nube no abre nada; encenderla, sí
    expect(burbujasAlEncenderLaNube({ ...camino, nieblaAhora: false })).toBe(false);
    expect(burbujasAlEncenderLaNube({ ...camino, nieblaAhora: true })).toBe(true);
    // Sin «Modo ayuda», nunca (nmwmwkh9otit); antes de la ventana, tampoco
    expect(burbujasAlEncenderLaNube({ ...camino, ayuda: false, nieblaAhora: true })).toBe(false);
    expect(burbujasAlEncenderLaNube({ ...camino, ventanaVista: false, nieblaAhora: true })).toBe(false);
    // La nube llama a alTocarLaNube, que las pide otra vez
    expect(codigo).toContain("if (b.closest('[data-niebla]')) requestAnimationFrame(() => requestAnimationFrame(alTocarLaNube));");
    const tocar = codigo.match(/function alTocarLaNube\([\s\S]*?\n\}/)?.[0] ?? '';
    expect(tocar).toContain('repetir = true;');
    expect(tocar).toContain('quizaBurbujas();');
  });

  it('sin ninguna burbuja a la vista, la primera vez no se gasta ni se marca como vista', () => {
    const cerrar = codigo.match(/function cerrarBurbujas\([\s\S]*?\n\}/)?.[0] ?? '';
    expect(cerrar).toContain('if (vistas) {');
    expect(codigo).toContain('return cerrarBurbujas(burbujas.vistas > 0);');
    const pintar = codigo.match(/function pintarBurbuja\([\s\S]*?\n\}/)?.[0] ?? '';
    expect(pintar.indexOf('burbujas.vistas++')).toBeGreaterThan(pintar.indexOf('if (!control) return siguienteBurbuja();'));
  });

  it('con «¿Dónde quedamos?» u otro diálogo abierto, esperan a que se cierre', () => {
    const quiza = codigo.match(/export function quizaBurbujas\([\s\S]*?\n\}/)?.[0] ?? '';
    expect(quiza).toContain("if (document.querySelector('dialog[open], [data-guia-capa]')) return;");
  });

  it('«Saltar todo» cierra en silencio, sin una línea después (nmwkbmdgxtit)', () => {
    const cerrar = codigo.match(/function cerrarBurbujas\([\s\S]*?\n\}/)?.[0] ?? '';
    expect(cerrar).not.toMatch(/avisar|aviso/);
    expect(codigo).toContain("if (b.closest('[data-induccion-saltar-todo]')) return cerrarBurbujas();");
  });

  it('sin «Escuchar»: la burbuja de la voz invita a probar la niebla, sin cargar la voz en el recorrido (nmwnnsrpwtit)', () => {
    expect(en['induccion.escuchar' as never]).toBeUndefined();
    expect(codigo).not.toContain('d.escuchar(');
    expect(leer('app.ts')).not.toContain('escuchar: (frase, idioma)');
    // Sin la voz del idioma, oirVoz dice cuál falta y cómo instalarla (nunca otra voz, ni silencio)
    const guia = leer('guiaLectura.ts');
    expect(guia.match(/export function oirVoz\([\s\S]*?\n\}/)?.[0]).toContain('else avisar(sinVozAhora(false, idioma));');
    expect(guia).toContain('const sonido = await audioDe(natural.id, frase ?? MUESTRA_VOZ[natural.idioma] ?? MUESTRA_VOZ.es);');
  });
});

describe('repetirla desde «Modo ayuda» (nmwk5ogpqtit, nmwmgs8ngtit)', () => {
  it('«Ver otra vez la introducción» va arriba de la sección, nunca en un globo (nmwmx69c7tit): la ventana desde el principio y luego las burbujas', () => {
    expect(repetirInduccionHtml()).toContain('data-induccion-repetir');
    const ayuda = leer('ayudaGuiada.ts');
    expect(ayuda).toContain("explicar(niebla, t('induccion.ayudaNiebla'));");
    expect(ayuda).toContain('data-guia-repetir>${esc(t(\'ayuda.repetir\'))}</button> ${repetirInduccionHtml()}</p>');
    const repetir = codigo.match(/export function repetirInduccion\([\s\S]*?\n\}/)?.[0] ?? '';
    expect(repetir).toContain('marcar(CLAVE_VENTANA, false);');
    expect(repetir).toContain('marcar(CLAVE_BURBUJAS, false);');
    expect(repetir).toContain('repetir = true;');
    expect(repetir).toContain('pagina = 0;');
  });

  it('lo visto no depende del idioma: sus claves no lo llevan (nmwjm5b8rtit), y cada texto existe en los dos', () => {
    expect(codigo).toContain("export const CLAVE_VENTANA = 'estudio.induccion.ventana';");
    for (const k of Object.keys(en).filter((x) => x.startsWith('induccion.'))) expect(es).toHaveProperty(k);
    expect(es['induccion.saltarTodo']).toBe('Saltar todo');
  });
});
