import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { t } from './textos';
import { antesDeCerrarConClicFuera, antesDeGrabar, antesDeOtroSobre, destinoDelFragmento, grabacionCallada, marcaDeCampos, microfonoSinSonido, modalDeArriba, nivelDeMuestra, nivelDePista, OIDO_VACIO, oirMuestra, ordenDeApertura, pisoDeNiveles, reemplazarMarcado, repartirDictado, sumarDictado, sumarOido, trozosConservados, vuelveAlFrente, type EstadoGrabacion, type Oido } from './grabadora';

describe('la grabadora avisa si el micrófono no le entrega sonido (propuesta aceptada pr_grabadora_muda)', () => {
  // Una señal de esa amplitud: la onda que llega, alternando el signo
  const senal = (amplitud: number) => Array.from({ length: 512 }, (_, i) => (i % 2 ? amplitud : -amplitud));
  const oir = (muestras: number[][]): Oido => muestras.reduce((o, m) => oirMuestra(o, nivelDeMuestra(m)), OIDO_VACIO);
  const veces = (n: number, m: number[]) => Array.from({ length: n }, () => m);
  // Lo que llega de cada micrófono, con cuatro muestras por segundo durante 10 segundos
  const muerto = veces(40, senal(0));
  const casiMuerto = veces(40, senal(0.0001));
  const normal = veces(40, senal(0.1));
  // El ruido parejo de un micrófono silenciado que no entrega cero: sube y baja un poco, sin pasar de ahí
  const ruido = (n: number) => Array.from({ length: n }, (_, i) => senal(0.0008 * (1 + 0.2 * Math.sin(i))));
  // Un micrófono bajo: ese mismo ruido de fondo, y una voz baja encima
  const bajo = [...ruido(8), ...veces(4, senal(0.003)), ...ruido(4), ...veces(4, senal(0.002)), ...ruido(4), ...veces(16, senal(0.003))];

  it('el nivel de una muestra', () => {
    expect(nivelDeMuestra([])).toBe(0);
    expect(nivelDeMuestra(senal(0))).toBe(0);
    expect(nivelDeMuestra(senal(0.5))).toBeCloseTo(0.5);
  });

  it('silencio total al empezar: a los 8 segundos se detiene y se descarta, y antes de eso nada (nmvy4m3xatit)', () => {
    for (const o of [oir(muerto), oir(casiMuerto)]) {
      expect(microfonoSinSonido(o, 7.9)).toBe(false);
      expect(microfonoSinSonido(o, 8)).toBe(true);
      expect(destinoDelFragmento(OIDO_VACIO, o)).toBe('descartar_todo');
    }
  });

  it('lo que dejó la prueba real del titular (1 de noviembre): silenciado, un solo golpe de pico 0,0035, y se detiene', () => {
    const silenciado = oir([senal(0.00352), ...veces(31, senal(0))]);
    expect(silenciado.conSonido).toBe(1);
    expect(microfonoSinSonido(silenciado, 8)).toBe(true);
    // Sus grabaciones con voz, con los pisos y picos de la bitácora, ni se detienen ni se descartan
    for (const [piso, pico] of [[0.03233, 0.40588], [0.00467, 0.3295], [0.00257, 0.32003], [0.0195, 0.2403]]) {
      const conVoz = oir(Array.from({ length: 32 }, (_, i) => senal(i % 8 < 5 ? pico : piso)));
      expect(microfonoSinSonido(conVoz, 8)).toBe(false);
      expect(destinoDelFragmento(OIDO_VACIO, conVoz)).toBe('guardar');
    }
  });

  it('una pausa larga después de hablar ni detiene ni descarta: la grabación se conserva entera (nmvy4m3xatit)', () => {
    // Dos palabras, y minutos callado: la pausa no cuenta
    const hablaYPausa = oir([...veces(2, senal(0.1)), ...veces(2400, senal(0))]);
    expect(microfonoSinSonido(hablaYPausa, 600)).toBe(false);
    expect(destinoDelFragmento(OIDO_VACIO, hablaYPausa)).toBe('guardar');
    // Aunque lo dicho quede en menos del 1 % de lo grabado: antes, esto se botaba
    expect(hablaYPausa.conSonido / hablaYPausa.muestras).toBeLessThan(0.01);
    // Con voz baja al empezar, sobre su ruido, y callado después: igual
    const bajoYPausa = oir([...veces(4, senal(0.003)), ...ruido(16), ...ruido(2000)]);
    expect(microfonoSinSonido(bajoYPausa, 500)).toBe(false);
    expect(destinoDelFragmento(OIDO_VACIO, bajoYPausa)).toBe('guardar');
  });

  it('un fragmento añadido nunca detiene la grabación: el micrófono ya mostró que oye, y si no trae sonido, solo no queda', () => {
    const antes = oir(veces(40, senal(0.1)));
    const callado = oir(veces(40, senal(0)));
    expect(microfonoSinSonido(callado, 60, antes)).toBe(false);
    expect(destinoDelFragmento(antes, callado)).toBe('quitar_fragmento');
    // Lo que sí mira el comienzo: sin nada antes
    expect(microfonoSinSonido(callado, 8, OIDO_VACIO)).toBe(true);
  });

  it('se repite en cada intento hasta que llega sonido: cada uno empieza de cero y el que oye sigue', () => {
    // Un intento: lo oído en sus primeros 8 segundos (32 muestras), como lo lleva la grabadora desde su reinicio
    const intento = (senales: number[][]) => {
      const o = oir(senales);
      return { seDetiene: microfonoSinSonido(o, 8), destino: destinoDelFragmento(OIDO_VACIO, o) };
    };
    for (let i = 0; i < 3; i++) expect(intento(veces(32, senal(0)))).toEqual({ seDetiene: true, destino: 'descartar_todo' });
    expect(intento(veces(32, senal(0.1)))).toEqual({ seDetiene: false, destino: 'guardar' });
    expect(intento(veces(32, senal(0)))).toEqual({ seDetiene: true, destino: 'descartar_todo' });
  });

  it('una muestra suelta, como el micrófono al abrirse, no deja pasar una grabación muda', () => {
    const conGolpe = oir([senal(0.5), ...veces(31, senal(0))]);
    expect(microfonoSinSonido(conGolpe, 8)).toBe(true);
    expect(destinoDelFragmento(OIDO_VACIO, conGolpe)).toBe('descartar_todo');
  });

  it('el por qué se canceló sale también como aviso, encima del diálogo, y la leyenda se queda (nmvy4nxxdtit)', () => {
    const grabadora = readFileSync(join(__dirname, 'grabadora.ts'), 'utf-8');
    const mudo = grabadora.match(/private descartarMudo\(\) \{[\s\S]*?\n {2}\}/)?.[0] ?? '';
    expect(mudo).toContain('this.avisar(texto);');
    expect(mudo).toContain('window.dispatchEvent(new CustomEvent(GRABACION_MUDA, { detail: texto }));');
    // Después de volver al frente: un aviso que sube antes del diálogo modal quedaría debajo de él
    expect(mudo.indexOf('aUnLado(this.caja, false);')).toBeLessThan(mudo.indexOf('dispatchEvent'));
    const app = readFileSync(join(__dirname, 'app.ts'), 'utf-8');
    expect(app).toContain('window.addEventListener(GRABACION_MUDA, (e) => avisar((e as CustomEvent<string>).detail, false, undefined, undefined, false, undefined, true));');
    // El aviso, en la capa de arriba (alFrente), sin repetir la frase dentro del diálogo, donde ya está la leyenda
    const avisar = app.match(/function avisar\([\s\S]*?\n\}/)?.[0] ?? '';
    expect(avisar).toContain('alFrente(e);');
    expect(avisar).toContain('if (!bien && !yaSeVe) {');
    // Un fragmento añadido sin sonido no cancela la grabación: ese no lleva este aviso
    expect(grabadora).not.toMatch(/quitar_fragmento[\s\S]{0,200}GRABACION_MUDA/);
  });

  it('con sonido nunca se pierde nada: lo dicho, aunque sea corto y entre mucho silencio, se queda', () => {
    const palabra = oir([...veces(2, senal(0.1)), senal(0)]);
    expect(grabacionCallada(palabra)).toBe(false);
    const hablaYSeMuere = oir([...veces(8, senal(0.1)), ...veces(2400, senal(0))]);
    expect(grabacionCallada(hablaYSeMuere)).toBe(false);
    expect(destinoDelFragmento(OIDO_VACIO, hablaYSeMuere)).toBe('guardar');
  });

  it('un fragmento añadido sin sonido sale solo él: lo de antes se queda entero', () => {
    const antes = oir(veces(40, senal(0.1)));
    expect(destinoDelFragmento(antes, oir(veces(20, senal(0))))).toBe('quitar_fragmento');
    expect(destinoDelFragmento(antes, oir(veces(20, senal(0.1))))).toBe('guardar');
    // Quitarlo es cortar la cola, y solo ella: lo que queda es el audio de antes de empezarlo
    expect(trozosConservados(['a', 'b', 'mudo', 'mudo'], 2)).toEqual(['a', 'b']);
    expect(trozosConservados(['a', 'b'], null)).toEqual(['a', 'b']);
    expect(sumarOido(antes, oir(veces(20, senal(0))))).toMatchObject({ muestras: 60, conSonido: 40 });
  });

  // Un micrófono silenciado puede entregar un ruido parejo, y no cero (nota de voz del titular nmvy2xvyxtit, 1 de noviembre)
  it('un ruido parejo sin voz se detiene a los 8 segundos y no se envía, aunque pase del umbral fijo', () => {
    expect(nivelDeMuestra(senal(0.0008))).toBeGreaterThan(0.0005);
    const o = oir(ruido(32));
    expect(o.conSonido).toBe(0);
    expect(microfonoSinSonido(oir(ruido(31)), 7.9)).toBe(false);
    expect(microfonoSinSonido(o, 8)).toBe(true);
    expect(destinoDelFragmento(OIDO_VACIO, o)).toBe('descartar_todo');
    // Con el micrófono al abrirse en cero, también: esas primeras muestras no son el piso
    const alAbrir = oir([senal(0), senal(0), ...ruido(30)]);
    expect(alAbrir.piso).toBeGreaterThan(0.0005);
    expect(microfonoSinSonido(alAbrir, 8)).toBe(true);
  });

  it('una voz baja sobre ese mismo ruido sigue y se guarda, también si empieza a los 2 segundos', () => {
    const voz = oir([...ruido(8), ...veces(24, senal(0.003))]);
    expect(voz.conSonido).toBe(24);
    expect(microfonoSinSonido(voz, 8)).toBe(false);
    expect(destinoDelFragmento(OIDO_VACIO, voz)).toBe('guardar');
    // Lo dicho antes de saber el piso cuenta igual: se cuenta otra vez con el piso que se va sabiendo
    const alEmpezar = oir([...veces(4, senal(0.003)), ...ruido(28)]);
    expect(alEmpezar.conSonido).toBe(4);
    expect(microfonoSinSonido(alEmpezar, 8)).toBe(false);
  });

  it('una frase corta sobre ese ruido se queda, y si la grabación dura poco no se arriesga lo dicho', () => {
    const frase = oir([...ruido(10), ...veces(3, senal(0.01)), ...ruido(19)]);
    expect(frase.conSonido).toBe(3);
    expect(microfonoSinSonido(frase, 8)).toBe(false);
    expect(grabacionCallada(frase)).toBe(false);
    // Menos de 2 segundos: todavía no hay piso, y una voz baja entera se queda
    expect(grabacionCallada(oir(veces(3, senal(0.003))))).toBe(false);
    expect(pisoDeNiveles([0.1, 0.1])).toBe(0);
  });

  it('una voz fuerte y pareja siempre es sonido, y un ruido que empieza después no borra lo dicho', () => {
    expect(oir(normal).conSonido).toBe(40);
    const dicho = oir([...ruido(8), ...veces(4, senal(0.003)), ...ruido(20), ...veces(400, senal(0.0028))]);
    expect(dicho.firme).toBe(true);
    expect(grabacionCallada(dicho)).toBe(false);
    expect(microfonoSinSonido(dicho, 100)).toBe(false);
  });

  it('una secuencia de ceros, o la pista que el navegador dice silenciada, se detienen igual', () => {
    expect(microfonoSinSonido(oir(veces(32, senal(0))), 8)).toBe(true);
    expect(nivelDePista(0.1, false)).toBe(0.1);
    expect(nivelDePista(0.1, true)).toBe(0);
    const silenciada = Array.from({ length: 32 }, () => nivelDePista(0.1, true)).reduce(oirMuestra, OIDO_VACIO);
    expect(microfonoSinSonido(silenciada, 8)).toBe(true);
    const grabadora = readFileSync(join(__dirname, 'grabadora.ts'), 'utf-8');
    expect(grabadora).toContain('getAudioTracks().some((x) => x.muted || !x.enabled)');
    expect(grabadora).toContain('reportarNiveles(this.oidoFragmento,');
  });

  it('ningún camino envía silencio ni pregunta si enviarlo', () => {
    const grabadora = readFileSync(join(__dirname, 'grabadora.ts'), 'utf-8');
    expect(grabadora).not.toMatch(/enviar-igual|enviarIgual|aceptoSilencio|grabadora\.callada/);
    expect(grabadora).toContain("if (g.state === 'recording' && !this.cerrarFragmento()) return Promise.resolve();");
    expect(grabadora).toContain("if (g?.state !== 'recording' || !this.cerrarFragmento()) return;");
    expect(grabadora).toContain('if (microfonoSinSonido(this.oidoFragmento, this.segundos - this.previos, this.oidoAntes)) return this.parar();');
  });

  it('un micrófono bajo no dispara la alarma', () => {
    expect(microfonoSinSonido(oir(bajo), 10)).toBe(false);
    expect(grabacionCallada(oir(bajo))).toBe(false);
  });

  it('el sonido normal tampoco', () => {
    expect(microfonoSinSonido(oir(normal), 10)).toBe(false);
    expect(grabacionCallada(oir(normal))).toBe(false);
  });

  it('con voz sigue, y al final unos golpes aislados no cambian que todo quedó en silencio', () => {
    const conVoz = oir([...veces(30, senal(0)), ...veces(10, senal(0.1))]);
    expect(microfonoSinSonido(conVoz, 10)).toBe(false);
    expect(grabacionCallada(conVoz)).toBe(false);
    const conGolpes = oir([...veces(399, senal(0)), senal(0.5), senal(0.5), senal(0.5)]);
    expect(grabacionCallada(conGolpes)).toBe(true);
    // Unos segundos en silencio tampoco se envían, aunque sean menos de 8; y sin muestras todavía, no se detiene
    expect(grabacionCallada(oir(veces(4, senal(0))))).toBe(true);
    expect(grabacionCallada(OIDO_VACIO)).toBe(true);
    expect(microfonoSinSonido(OIDO_VACIO, 6)).toBe(false);
  });
});

describe('sumarle algo hablando a una nota que el director aún no lee (nota de voz del titular nmvonrzz6tit, 25 de octubre de 2026)', () => {
  it('lo dicho queda al final, en un párrafo aparte, y sin nada antes queda solo', () => {
    expect(sumarDictado('Lo que escribí.  \n', ' Y esto lo dije. ')).toBe('Lo que escribí.\n\nY esto lo dije.');
    expect(sumarDictado('  ', 'Solo lo dicho.')).toBe('Solo lo dicho.');
    expect(sumarDictado('Igual que antes.', '   ')).toBe('Igual que antes.');
  });

  it('el diálogo «Corregir la nota» graba y lo suma al guardar, y el servidor transcribe sin guardar el audio', () => {
    const pagina = readFileSync(join(__dirname, 'app.ts'), 'utf-8');
    const corregir = pagina.slice(pagina.indexOf("titulo: tx('nota.corregirTitulo')"), pagina.indexOf('} else if (ds.decidir)'));
    expect(corregir).toContain('audio: true');
    expect(corregir).toContain('await dictar(r.audio)');
    expect(corregir).toContain('repartirDictado(');
    const servidor = readFileSync(join(__dirname, '..', 'servidor', 'api.ts'), 'utf-8');
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

  it('lo que marcaste, lo reemplaza lo dicho, en el campo que marcaste (pedido pd_tipo_voz)', () => {
    expect(reemplazarMarcado('Quiero el botón azul arriba.', 16, 20, ' verde ')).toBe('Quiero el botón verde arriba.');
    // Sin pegar palabras: un espacio a cada lado si falta, y nada antes de un punto
    expect(reemplazarMarcado('Quiero el botónazul.', 15, 19, 'verde')).toBe('Quiero el botón verde.');
    expect(reemplazarMarcado('Algo.', 0, 5, '  ')).toBe('Algo.');
    const texto = 'Lo escrito, con un error aquí.';
    expect(repartirDictado({ texto, dicho: 'Lo del audio.' }, 'un acierto', { campo: 'texto', inicio: 16, fin: 24 })).toEqual({ texto: 'Lo escrito, con un acierto aquí.', dicho: 'Lo del audio.' });
    expect(repartirDictado({ texto, dicho: 'Lo del audio.' }, 'de la voz', { campo: 'dicho', inicio: 3, fin: 12 })).toEqual({ texto, dicho: 'Lo de la voz.' });
    // Sin nada marcado (solo el cursor), o marcado en un campo que no está, se suma como siempre
    expect(marcaDeCampos([{ campo: 'texto', inicio: 4, fin: 4 }])).toBeNull();
    expect(repartirDictado({ texto: 'Escrito.' }, 'Y esto.', { campo: 'dicho', inicio: 0, fin: 3 })).toEqual({ texto: 'Escrito.\n\nY esto.', dicho: undefined });
    // Marcado en los dos: vale el último que tocaste
    const dos = [{ campo: 'texto' as const, inicio: 0, fin: 2 }, { campo: 'dicho' as const, inicio: 1, fin: 3 }];
    expect(marcaDeCampos(dos, 'dicho')?.campo).toBe('dicho');
    expect(marcaDeCampos(dos)?.campo).toBe('texto');
    const pagina = readFileSync(join(__dirname, 'app.ts'), 'utf-8');
    const corregir = pagina.slice(pagina.indexOf("titulo: tx('nota.corregirTitulo')"), pagina.indexOf('} else if (ds.decidir)'));
    expect(corregir).toContain('repartirDictado({ texto, dicho: nuevo, despues }, sumado, marca)');
    expect(corregir).toContain("tx('nota.ayudaGrabar'");
    expect(t('nota.ayudaGrabar')).toContain('márcala antes de grabar: lo que digas la reemplaza');
  });

  it('el diálogo no manda una transcripción vacía al servidor: lo dice antes', () => {
    const pagina = readFileSync(join(__dirname, 'app.ts'), 'utf-8');
    const corregir = pagina.slice(pagina.indexOf("titulo: tx('nota.corregirTitulo')"), pagina.indexOf('} else if (ds.decidir)'));
    expect(corregir).toContain("avisar(tx('nota.dichoVacio'))");
    expect(corregir.indexOf('nota.dichoVacio')).toBeLessThan(corregir.indexOf("tipo: 'corregir_transcripcion'"));
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

describe('«Enviar ya» envía sin volver a mostrar el diálogo (nota de voz del titular nmvvki7gktit, 30 de octubre de 2026)', () => {
  const ts = readFileSync(join(__dirname, 'grabadora.ts'), 'utf-8');
  const pagina = readFileSync(join(__dirname, 'app.ts'), 'utf-8');

  it('con «Enviar ya» y algo grabado en un formulario, el diálogo no vuelve al frente; con «Detener y revisar», sí', () => {
    expect(vuelveAlFrente({ enviarYa: true, conAudio: true, enFormulario: true })).toBe(false);
    expect(vuelveAlFrente({ enviarYa: false, conAudio: true, enFormulario: true })).toBe(true);
    // Sin nada grabado o sin formulario que lo envíe, no hay envío: vuelve para que se vea qué pasó
    expect(vuelveAlFrente({ enviarYa: true, conAudio: false, enFormulario: true })).toBe(true);
    expect(vuelveAlFrente({ enviarYa: true, conAudio: true, enFormulario: false })).toBe(true);
  });

  it('al cerrar la grabación, solo vuelve al frente lo que no se envía; mientras se envía, la pastilla lo dice', () => {
    const cerrar = ts.match(/private cerrar\(\): Promise<void> \{[\s\S]*?\n {2}\}/)?.[0] ?? '';
    expect(cerrar).toContain('const alFrente = vuelveAlFrente({ enviarYa: this.enviarAlTerminar, conAudio: !!this.blob.size, enFormulario: !!form });');
    expect(cerrar).toContain('if (alFrente) aUnLado(this.caja, false);');
    expect(cerrar).not.toMatch(/\n\s*aUnLado\(this\.caja, false\);/);
    expect(cerrar).toContain('if (!alFrente) form?.requestSubmit();');
    expect(ts).toContain("<b>${t('grabadora.enviando')}</b>");
    // «Detener y revisar» lo sigue trayendo al frente, con lo grabado listo para revisar
    const armar = ts.match(/private armar\(\) \{[\s\S]*?\n {2}\}/)?.[0] ?? '';
    expect(armar).toContain('aUnLado(this.caja, false);');
  });

  it('si el envío no sigue (falta algo o no se guardó), el diálogo vuelve al frente con su aviso', () => {
    const alFrente = ts.match(/ {2}alFrente\(\) \{[\s\S]*?\n {2}\}/)?.[0] ?? '';
    expect(alFrente).toContain('if (!this.enviando) return;');
    expect(alFrente).toContain('aUnLado(this.caja, false);');
    expect(pagina).toMatch(/\} finally \{\n\s*enviando = false;\n\s*\/\/[^\n]*\n\s*if \(!listo\) grabadora\?\.alFrente\(\);/);
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
