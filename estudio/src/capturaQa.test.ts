// La fotonota (nmwpwqyi0tit): una sola barra arriba, con iconos que se explican al pasar el cursor, y la imagen entera debajo.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { accionDeFotos, barraDeCaptura, ESTILO, fotosAlFinal, GROSORES, miniaturasHtml, sinLaFoto, zoomHtml } from './capturaQa';
import { t } from './textos';

const leer = (f: string) => readFileSync(new URL(f, import.meta.url), 'utf8');
const pos = (html: string, marca: string) => {
  const i = html.indexOf(marca);
  expect(i, marca).toBeGreaterThanOrEqual(0);
  return i;
};

describe('la barra de la fotonota', () => {
  const barra = barraDeCaptura();

  it('es una sola, y no queda pie abajo', () => {
    expect(barra.match(/class="qa-barra"/g)).toHaveLength(1);
    const fuente = leer('./capturaQa.ts');
    expect(fuente).not.toContain('qa-pie');
    expect(ESTILO).not.toContain('qa-pie');
    expect(fuente).toContain('<div class="qa-lienzo"></div></form>');
  });

  it('lleva la grabación, «Enviar ya» (de la grabadora) y «Dejarlo en el Buzón» dentro, y «Cancelar» es lo último, al extremo derecho', () => {
    const cancelar = pos(barra, 'data-descartar');
    expect(pos(barra, 'data-grabadora')).toBeLessThan(cancelar);
    expect(pos(barra, 'type="submit"')).toBeGreaterThan(pos(barra, 'data-grabadora'));
    expect(pos(barra, 'type="submit"')).toBeLessThan(cancelar);
    expect(pos(barra, 'data-fotos')).toBeLessThan(cancelar);
    // Ningún otro botón ni control después de «Cancelar»
    expect(barra.slice(cancelar)).not.toMatch(/<(button|input|select|div|span)/);
    expect(barra.slice(cancelar).match(/<button/g) ?? []).toHaveLength(0);
    expect(ESTILO).toContain('.qa-barra .qa-cancelar{margin-left:auto}');
    expect(pos(barra, 'data-limpiar')).toBeLessThan(cancelar);
    expect(pos(barra, 'data-deshacer')).toBeLessThan(pos(barra, 'data-limpiar'));
    expect(pos(barra, 'data-grosor="grueso"')).toBeLessThan(pos(barra, 'data-deshacer'));
    expect(pos(barra, 'data-herramienta="linea"')).toBeLessThan(pos(barra, 'data-grosor="fino"'));
    // Todo dentro de la barra: no hay otra caja de controles
    expect(barra.trim().endsWith('</div>')).toBe(true);
  });

  it('las herramientas son iconos SVG con su descripción al pasar el cursor (title y aria-label)', () => {
    for (const [atr, clave] of [['data-herramienta="rectangulo"', 'qa.rectangulo'], ['data-herramienta="lapiz"', 'qa.lapiz'], ['data-herramienta="linea"', 'qa.linea'], ['data-grosor="fino"', 'qa.fino'], ['data-grosor="medio"', 'qa.medio'], ['data-grosor="grueso"', 'qa.grueso'], ['data-deshacer', 'qa.deshacer']] as const) {
      const boton = barra.match(new RegExp(`<button[^>]*${atr}[^>]*>.*?</button>`, 's'))?.[0] ?? '';
      expect(boton, atr).toContain(`title="${t(clave)}"`);
      expect(boton, atr).toContain(`aria-label="${t(clave)}"`);
      expect(boton, atr).toContain('<svg');
      expect(boton.replace(/<svg.*<\/svg>/s, ''), atr).not.toContain(t(clave) + '<');
    }
  });

  it('los controles de la grabación llevan su texto en la barra, y «Grabando» con su tiempo se ve (nmwqkrhsmtit)', () => {
    // Ya no son iconos sueltos: nada esconde el texto de los botones ni lo cambia por un símbolo
    expect(ESTILO).not.toMatch(/\[data-g[^\]]*\]::before/);
    expect(ESTILO).not.toMatch(/\.grabadora[^{]*\{[^}]*font-size:0/);
    expect(ESTILO).toContain('.qa-captura .qa-barra .grabadora [data-g]{font-size:14px;');
    expect(ESTILO).toContain('.qa-captura .qa-barra .grabadora .grabando-texto{font-size:14px;');
    const grabadora = leer('./grabadora.ts');
    // Cada control escribe su texto: grabar, detener y comprobar, enviar ya, añadir otro fragmento y quitar el audio
    for (const clave of ['grabadora.grabar', 'grabadora.enviarYa', 'grabadora.quitar', 'grabadora.anadir']) expect(grabadora).toMatch(new RegExp(`>[^<]*\\$\\{t\\('${clave}'\\)\\}</button>`));
    expect(grabadora).toContain("'grabadora.detenerRevisar' : 'grabadora.detener')}</button>");
    expect(grabadora).toContain("t('grabadora.grabando')");
    expect(t('grabadora.detenerRevisar')).toBe('Detener y comprobar');
  });

  it('los botones de icono son círculos perfectos: ningún mínimo de alto de la página los estira (nmwqkrhsmtit)', () => {
    // El estilo general de los botones del Studio pone min-height:36px; en la barra no vale
    expect(ESTILO).toMatch(/\.qa-barra button\{[^}]*min-height:0;min-width:0;/);
    expect(ESTILO).toMatch(/\.qa-barra \.qa-icono\{[^}]*aspect-ratio:1;border-radius:50%/);
    expect(ESTILO).toMatch(/\.qa-mini \.qa-x\{[^}]*width:20px;height:20px;min-height:0;min-width:0;aspect-ratio:1;[^}]*place-items:center;border-radius:50%/);
    expect(ESTILO).toMatch(/\.qa-cerrar-zoom\{[^}]*width:44px;height:44px;min-height:0;min-width:0;aspect-ratio:1;[^}]*place-items:center;border-radius:50%/);
    // La X es un dibujo, no la letra «×», que nunca queda al centro
    expect(miniaturasHtml(['blob:a'])).not.toContain('×');
    expect(miniaturasHtml(['blob:a'])).toMatch(/data-quitar-foto="0"[^>]*><svg[^>]*width="12"/);
  });

  it('la foto grande lleva una X de cerrar arriba a la derecha (nmwqkshv3tit)', () => {
    const html = zoomHtml('blob:a');
    expect(html).toContain('<img src="blob:a" alt="">');
    expect(html).toMatch(/<button type="button" class="qa-cerrar-zoom" data-cerrar-zoom title="[^"]+" aria-label="[^"]+"><svg/);
    expect(ESTILO).toMatch(/\.qa-cerrar-zoom\{position:absolute;top:16px;right:16px;/);
    // La foto grande ya no es un botón entero (un botón dentro de otro): la X es el botón, y un clic fuera sigue cerrándola
    const fuente = leer('./capturaQa.ts');
    expect(fuente).not.toContain("zoom.setAttribute('role', 'button')");
    expect(fuente).toContain('zoom.innerHTML = zoomHtml(urls[i]);');
  });

  it('los grosores se dibujan como una raya de cada grosor, y «Borrar los dibujos» y «Cancelar» siguen con su texto', () => {
    for (const px of Object.values(GROSORES)) expect(barra).toContain(`stroke-width="${px}"`);
    expect(barra).toMatch(new RegExp(`<button[^>]*data-limpiar[^>]*>${t('qa.limpiar')}</button>`));
    expect(barra).toMatch(new RegExp(`<button[^>]*data-descartar[^>]*>${t('qa.descartar')}</button>`));
  });
});

describe('«Dejar la nota en el Buzón» y «Audio listo»', () => {
  it('el botón del Buzón lleva su texto completo, no solo el icono', () => {
    const boton = barraDeCaptura().match(/<button[^>]*data-dejar[^>]*>.*?<\/button>/s)?.[0] ?? '';
    expect(boton).toContain(t('qa.dejarBuzon'));
    expect(t('qa.dejarBuzon')).toBe('Dejar la nota en el Buzón');
  });

  it('«Audio listo» ya no lleva la explicación de la transcripción, y va junto a los botones sin ocupar un renglón', () => {
    expect(t('grabadora.listo', { tiempo: '0:03' })).toBe('Audio listo (0:03).');
    // Solo en la fotonota: la nota del ✉ sigue explicando que se transcribe sola
    expect(ESTILO).toContain('.audio-listo .se-transcribe{display:none}');
    expect(t('grabadora.seTranscribe')).not.toBe('');
    expect(ESTILO).toContain('.audio-listo{flex:0 1 auto;flex-basis:auto;');
    expect(ESTILO).toContain('.qa-barra{flex:none;display:flex;flex-wrap:nowrap;align-items:center;');
    expect(ESTILO).toContain('height:52px');
  });

  it('los botones de icono centran el icono en los dos ejes', () => {
    expect(ESTILO).toMatch(/\.qa-barra \.qa-icono\{display:inline-flex;align-items:center;justify-content:center;/);
    expect(ESTILO).toContain('.qa-barra svg{display:block');
  });
});

describe('las miniaturas de las fotos', () => {
  it('cada foto es una miniatura que se agranda y, aparte, una X que la quita; nunca un botón dentro de otro', () => {
    const html = miniaturasHtml(['blob:a', 'blob:b']);
    expect(html.match(/<img /g)).toHaveLength(2);
    expect(html.match(/data-ver-foto="/g)).toHaveLength(2);
    expect(html.match(/data-quitar-foto="/g)).toHaveLength(2);
    expect(html).not.toMatch(/<button(?:(?!<\/button>).)*<button/s);
    expect(html).toMatch(/<button[^>]*data-ver-foto="1"[^>]*><img src="blob:b" alt=""><\/button>/);
  });

  it('un clic en la miniatura agranda y nunca cancela; la X quita solo esa foto', () => {
    const ver = accionDeFotos({ dataset: { verFoto: '1' } });
    expect(ver).toEqual({ tipo: 'ver', indice: 1 });
    expect(accionDeFotos({ dataset: { quitarFoto: '0' } })).toEqual({ tipo: 'quitar', indice: 0 });
    expect(accionDeFotos({ dataset: { descartar: '' } }).tipo).toBe('nada');
    expect(accionDeFotos(null).tipo).toBe('nada');
    expect(sinLaFoto(['a', 'b', 'c'], 1)).toEqual(['a', 'c']);
    const original = ['a', 'b'];
    sinLaFoto(original, 0);
    expect(original).toEqual(['a', 'b']);
  });

  it('el clic en las miniaturas se atiende antes que cualquier botón de la barra y no sube a «Cancelar»', () => {
    const fuente = leer('./capturaQa.ts');
    const manejador = fuente.slice(fuente.indexOf("addEventListener('click', (e) => {\n      const b ="));
    expect(manejador.indexOf("b.closest('[data-fotos]')")).toBeGreaterThan(0);
    expect(manejador.indexOf("b.closest('[data-fotos]')")).toBeLessThan(manejador.indexOf('data-descartar'));
    expect(manejador.slice(0, manejador.indexOf('data-descartar'))).toContain('e.stopPropagation()');
    // Esc cierra la foto grande y no la nota
    expect(fuente).toContain("if (e.key === 'Escape' && zoom)");
  });
});

describe('the photos of a photo note: one per recorded fragment, never one more for sending (nmwqme8cbtit)', () => {
  it('start, pause and resume, then send gives exactly 2 images', () => {
    expect(fotosAlFinal(['empezar', 'rayar', 'pausar', 'seguir', 'rayar', 'enviar'])).toBe(2);
    // The case of note nmwqmbx54tit: both fragments paused, and a stray click on the drawing before sending
    expect(fotosAlFinal(['empezar', 'rayar', 'pausar', 'seguir', 'rayar', 'pausar', 'rayar', 'enviar'])).toBe(2);
    expect(fotosAlFinal(['empezar', 'pausar', 'seguir', 'pausar', 'enviar'])).toBe(2);
  });

  it('a single fragment gives one image, whether sent while recording or after its pause', () => {
    expect(fotosAlFinal(['empezar', 'enviar'])).toBe(1);
    expect(fotosAlFinal(['empezar', 'rayar', 'pausar', 'rayar', 'enviar'])).toBe(1);
  });

  it('sending waits for the photo a pause is still taking, instead of counting it as missing', () => {
    const src = leer('./capturaQa.ts');
    expect(src.indexOf('await tomando;')).toBeGreaterThan(-1);
    expect(src.indexOf('await tomando;')).toBeLessThan(src.indexOf('fotoAlEnviar({ fotos: fotos.length + quitadas'));
  });
});

describe('el área de la imagen', () => {
  it('ocupa todo lo que queda bajo la barra: alto de la ventana visible, sin relleno ni recorte por abajo', () => {
    expect(ESTILO).toContain('height:100dvh');
    expect(ESTILO).toMatch(/\.qa-lienzo\{flex:1;min-height:0;[^}]*\}/);
    expect(ESTILO).not.toMatch(/\.qa-lienzo\{[^}]*padding/);
    expect(ESTILO).toContain('.qa-lienzo canvas{max-width:100%;max-height:100%');
    // Solo hay una barra en el diálogo, y el lienzo es lo único que le sigue
    expect(leer('./capturaQa.ts')).toContain('<form method="dialog">${barraDeCaptura()}<div class="qa-lienzo"></div></form>');
  });
});
