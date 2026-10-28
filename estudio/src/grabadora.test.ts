import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { antesDeCerrarConClicFuera, antesDeGrabar, antesDeOtroSobre, modalDeArriba, ordenDeApertura, repartirDictado, sumarDictado, type EstadoGrabacion } from './grabadora';

describe('sumarle algo hablando a una nota que el director aún no lee (nota de voz del titular nmvonrzz6tit, 25 de octubre de 2026)', () => {
  it('lo dicho queda al final, en un párrafo aparte, y sin nada antes queda solo', () => {
    expect(sumarDictado('Lo que escribí.  \n', ' Y esto lo dije. ')).toBe('Lo que escribí.\n\nY esto lo dije.');
    expect(sumarDictado('  ', 'Solo lo dicho.')).toBe('Solo lo dicho.');
    expect(sumarDictado('Igual que antes.', '   ')).toBe('Igual que antes.');
  });

  it('el diálogo «Corregir la nota» graba y lo suma al guardar, y el servidor transcribe sin guardar el audio', () => {
    const pagina = readFileSync(join(__dirname, 'director.ts'), 'utf-8');
    const corregir = pagina.slice(pagina.indexOf("titulo: 'Corregir la nota'"), pagina.indexOf('} else if (ds.decidir)'));
    expect(corregir).toContain('audio: true');
    expect(corregir).toContain('await dictar(r.audio)');
    expect(corregir).toContain('repartirDictado(');
    const servidor = readFileSync(join(__dirname, '..', 'servidor', 'director.ts'), 'utf-8');
    const dictar = servidor.slice(servidor.indexOf("ruta === '/dictar'"), servidor.indexOf("ruta === '/comprobar'"));
    expect(dictar).toContain("'.estudio/dictados'");
    expect(dictar).toContain('await rm(audio');
    expect(dictar).toContain('await rm(txtDeAudio(audio)');
  });

  it('borrar lo que se entendió del audio y grabar otra cosa la reemplaza, sin dejarla vacía (nota de voz nmvpmv30ytit)', () => {
    // Lo de la nota: una elección escrita y un audio; vació lo que se entendió y grabó otra cosa
    expect(repartirDictado({ texto: 'Otra cosa (te cuento con ✉)', dicho: '  ' }, ' Lo que quiero decir ahora. '))
      .toEqual({ texto: 'Otra cosa (te cuento con ✉)', dicho: 'Lo que quiero decir ahora.' });
    // Sin vaciar nada, se suma al final de la nota escrita y lo entendido queda igual
    expect(repartirDictado({ texto: 'Escrito.', dicho: 'Lo de antes.' }, 'Y esto.')).toEqual({ texto: 'Escrito.\n\nY esto.', dicho: 'Lo de antes.' });
    // Solo de voz: se suma a lo que se entendió
    expect(repartirDictado({ dicho: 'Lo de antes.' }, 'Y esto.')).toEqual({ texto: undefined, dicho: 'Lo de antes.\n\nY esto.' });
    // Vació los dos: lo dicho va a lo que se entendió, que no puede quedar vacío
    expect(repartirDictado({ texto: '', dicho: '' }, 'Todo nuevo.')).toEqual({ texto: '', dicho: 'Todo nuevo.' });
    // Una nota escrita sin audio: lo dicho va a su texto
    expect(repartirDictado({ texto: 'Escrito.' }, 'Y esto.')).toEqual({ texto: 'Escrito.\n\nY esto.', dicho: undefined });
  });

  it('el diálogo no manda una transcripción vacía al servidor: lo dice antes', () => {
    const pagina = readFileSync(join(__dirname, 'director.ts'), 'utf-8');
    const corregir = pagina.slice(pagina.indexOf("titulo: 'Corregir la nota'"), pagina.indexOf('} else if (ds.decidir)'));
    expect(corregir).toContain("avisar('Lo que dijiste en el audio no puede quedar vacío");
    expect(corregir.indexOf('no puede quedar vacío')).toBeLessThan(corregir.indexOf("tipo: 'corregir_transcripcion'"));
  });
});

/** Un diálogo de mentira: solo lo que miran modalDeArriba y ordenDeApertura (si está abierto, si es modal, qué lleva). */
const dialogo = (modal = false, dentro: unknown[] = []) => {
  const d = {
    nodeName: 'DIALOG',
    open: true,
    isConnected: true,
    matches: (s: string) => s === ':modal' && modal && d.open,
    contains: (x: unknown) => dentro.includes(x),
  };
  return d as unknown as HTMLDialogElement;
};
/** Lo que anota el MutationObserver de la página cuando un diálogo se abre (el atributo open no estaba) o se cierra. */
const abrio = (d: HTMLDialogElement) => ({ target: d, attributeName: 'open', oldValue: null });
const cerro = (d: HTMLDialogElement) => ({ target: d, attributeName: 'open', oldValue: '' });

describe('la pastilla de la grabación, siempre encima (notas del titular, 21 y 22 de octubre de 2026)', () => {
  it('se lleva dentro del diálogo modal que queda debajo, si el ✉ se abrió desde él', () => {
    const graba = dialogo();
    const dondeQuedamos = dialogo(true);
    expect(modalDeArriba(graba, [graba, dondeQuedamos], ordenDeApertura([], [abrio(dondeQuedamos), abrio(graba)]))).toBe(dondeQuedamos);
    // Sin saber en qué orden se abrieron, el último de la página
    const otro = dialogo(true);
    expect(modalDeArriba(graba, [otro, dondeQuedamos, graba])).toBe(dondeQuedamos);
  });

  it('se lleva dentro del diálogo modal que se abre después de empezar a grabar, aunque esté antes en la página', () => {
    // Grabando en Preguntas, se abre «¿Dónde quedamos?» y, desde él, el ✉, que es de los primeros de la página
    const sobre = dialogo(true);
    const preguntas = dialogo();
    const dondeQuedamos = dialogo(true);
    const pagina = [sobre, preguntas, dondeQuedamos];
    const orden = ordenDeApertura([], [abrio(preguntas), abrio(dondeQuedamos), abrio(sobre)]);
    expect(modalDeArriba(preguntas, pagina, orden)).toBe(sobre);
    // El que se vio abrirse es más nuevo que uno que ya estaba abierto antes de empezar a mirar
    expect(modalDeArriba(preguntas, pagina, [dondeQuedamos])).toBe(dondeQuedamos);
  });

  it('si el de arriba se cierra, vuelve al que queda abierto debajo; si no queda ninguno, a su lugar', () => {
    const sobre = dialogo(true);
    const preguntas = dialogo();
    const dondeQuedamos = dialogo(true);
    const pagina = [sobre, preguntas, dondeQuedamos];
    let orden = ordenDeApertura([], [abrio(preguntas), abrio(dondeQuedamos), abrio(sobre)]);
    Object.assign(sobre, { open: false });
    orden = ordenDeApertura(orden, [cerro(sobre)]);
    expect(modalDeArriba(preguntas, pagina, orden)).toBe(dondeQuedamos);
    Object.assign(dondeQuedamos, { open: false });
    orden = ordenDeApertura(orden, [cerro(dondeQuedamos)]);
    expect(modalDeArriba(preguntas, pagina, orden)).toBeNull();
  });

  it('un diálogo abierto sin ser modal no se la lleva, aunque se abra después: no tapa ni deja sin clics', () => {
    const graba = dialogo();
    const abajo = dialogo(true);
    const suelto = dialogo(false);
    expect(modalDeArriba(graba, [abajo, graba, suelto], ordenDeApertura([], [abrio(abajo), abrio(graba), abrio(suelto)]))).toBe(abajo);
  });

  it('se queda donde está si no hay otro diálogo modal abierto', () => {
    const graba = dialogo();
    expect(modalDeArriba(graba, [graba, dialogo(false)])).toBeNull();
  });

  it('nunca se lleva dentro de sí misma ni de un diálogo que está dentro de ella', () => {
    const interno = dialogo(true);
    const graba = dialogo(true, [interno]);
    expect(modalDeArriba(graba, [graba, interno], [graba, interno])).toBeNull();
  });
});

describe('el orden en que se abren los diálogos: el último que se abrió queda arriba', () => {
  it('el que se abre pasa al final, también si se cierra y se vuelve a abrir en el mismo momento', () => {
    const a = dialogo(true);
    const b = dialogo(true);
    const orden = ordenDeApertura([], [abrio(a), abrio(b)]);
    expect(orden).toEqual([a, b]);
    // Así vuelve al frente el diálogo que grababa: se cierra y se abre otra vez, modal
    expect(ordenDeApertura(orden, [cerro(a), abrio(a)])).toEqual([b, a]);
  });

  it('sale el que se cerró y el que ya no está en la página, aunque nadie lo haya cerrado', () => {
    const a = dialogo(true);
    const b = dialogo(true);
    const c = dialogo(true);
    const orden = ordenDeApertura([], [abrio(a), abrio(b), abrio(c)]);
    Object.assign(a, { open: false });
    Object.assign(c, { isConnected: false });
    expect(ordenDeApertura(orden, [cerro(a)])).toEqual([b]);
  });

  it('un <details> también tiene open, pero no es un diálogo; y lo que entra o sale de la página no cambia el orden', () => {
    const a = dialogo(true);
    const detalles = Object.assign(dialogo(), { nodeName: 'DETAILS' });
    expect(ordenDeApertura([a], [abrio(detalles)])).toEqual([a]);
    expect(ordenDeApertura([a], [{ target: dialogo(true), attributeName: null, oldValue: null }])).toEqual([a]);
  });
});

describe('otro ✉ mientras se graba: nada grabado se pierde en silencio (nota de voz del titular, 22 de octubre de 2026)', () => {
  const estados: EstadoGrabacion[] = ['sin_audio', 'grabando', 'audio_listo'];

  it('con el ✉ cerrado, el otro se abre: no hay nada que perder', () => {
    for (const e of estados) expect(antesDeOtroSobre(false, e)).toBeNull();
  });

  it('abierto, nunca se rehace encima, tenga lo que tenga', () => {
    for (const e of estados) expect(antesDeOtroSobre(true, e)).toMatch(/no se abrió nada más/);
  });

  it('grabando a un lado, la frase nombra los dos botones de su pastilla para seguir', () => {
    const frase = antesDeOtroSobre(true, 'grabando')!;
    expect(frase).toMatch(/^Para no perder lo que estás grabando/);
    expect(frase).toContain('«Enviar ya»');
    expect(frase).toContain('«Detener y revisar»');
  });

  it('con un audio grabado sin enviar, primero se envía o se cancela', () => {
    expect(antesDeOtroSobre(true, 'audio_listo')).toMatch(/^Para no perder el audio que grabaste.*envía esta nota o cancélala/);
    expect(antesDeOtroSobre(true, 'sin_audio')).toMatch(/^Para no perder lo que tienes abierto/);
  });

  it('la persona ve qué pasó en una sola frase', () => {
    for (const e of estados) expect(antesDeOtroSobre(true, e)!.match(/[.!?](\s|$)/g)).toHaveLength(1);
  });

  it('detenida, un clic fuera (el que busca el otro ✉) no cierra la nota con su audio: lo dice en una frase', () => {
    expect(antesDeCerrarConClicFuera('sin_audio')).toBeNull();
    for (const e of ['audio_listo', 'grabando'] as const) {
      const frase = antesDeCerrarConClicFuera(e)!;
      expect(frase).toMatch(/^Para no perder el audio que grabaste.*envíala o cancélala/);
      expect(frase.match(/[.!?](\s|$)/g)).toHaveLength(1);
    }
  });
});

describe('una grabación a la vez (nota del titular, 22 de octubre de 2026: una en «Preguntas» y otra en un ✉ se encimaban)', () => {
  it('sin otra en curso, graba; con otra, no empieza y lo dice en una sola frase', () => {
    expect(antesDeGrabar(false)).toBeNull();
    const frase = antesDeGrabar(true)!;
    expect(frase).toMatch(/^Ya hay otra grabación en curso/);
    expect(frase.match(/[.!?](\s|$)/g)).toHaveLength(1);
  });

  it('cuenta como en curso desde que pide el micrófono hasta que lo suelta, y sale al terminar', () => {
    const ts = readFileSync(join(__dirname, 'grabadora.ts'), 'utf-8');
    expect(ts).toMatch(/return this\.pidiendo \|\| !!this\.mic;/);
    expect(ts).toMatch(/this\.pidiendo = true;\s*const flujo = await navigator\.mediaDevices\.getUserMedia/);
    expect(ts.slice(ts.indexOf('async terminar()'))).toMatch(/^async terminar\(\): Promise<void> \{\s*this\.terminada = true;\s*grabadoras\.delete\(this\);/);
  });
});

describe('la pastilla de la grabación toma el ancho de lo que lleva (nota de voz del titular, 22 de octubre de 2026)', () => {
  const ts = readFileSync(join(__dirname, 'grabadora.ts'), 'utf-8');
  const css = readFileSync(join(__dirname, 'director.css'), 'utf-8');

  it('el punto, el tiempo, las ondas, «Detener y revisar» y «Enviar ya» van juntos en una sola fila', () => {
    const fila = ts.slice(ts.indexOf('<span class="fila-g">'), ts.indexOf('<span class="ayuda-g">Puedes leer'));
    for (const x of ['punto-grabando', 'grabando-texto', 'nivel-voz', 'data-g="parar"', 'data-g="enviar"']) expect(fila).toContain(x);
    expect(css).toMatch(/\.fila-g \{[^}]*flex-wrap: nowrap/);
    expect(css).toMatch(/\.fila-g button \{ white-space: nowrap; \}/);
  });

  it('sin un tope fijo de ancho: solo el de la pantalla, y la fila se parte solo en una de verdad angosta', () => {
    const pastilla = css.match(/dialog\.a-un-lado \.grabadora \{[^}]*\}/)?.[0] ?? '';
    expect(pastilla).toContain('width: max-content');
    expect(pastilla).not.toContain('620px');
    expect(pastilla).toContain('flex-direction: column');
    expect(css).toMatch(/@media \(max-width: 479px\) \{ \.fila-g \{ flex-wrap: wrap;/);
  });
});
