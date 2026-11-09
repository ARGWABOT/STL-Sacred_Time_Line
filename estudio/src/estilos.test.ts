import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(__dirname, 'director.css'), 'utf-8');
const estilos = readFileSync(join(__dirname, 'estilos.css'), 'utf-8');

describe('los estilos mientras el director revisa', () => {
  it('no apagan lo que se puede hacer en una misión: marcar, elegir, «Hazlo tú» y «Ya lo hice» (nota del titular, 21 de octubre de 2026)', () => {
    const apagados = [...css.matchAll(/body\.director-trabajando\s+([^{]+)\{[^}]*not-allowed/g)].map((m) => m[1].trim());
    for (const libre of ['.listo-paso', '.boton-opcion', '.ya-lo-dije', '.hazlo-paso', '.boton-ya-hice']) expect(apagados).not.toContain(libre);
    // «Ya te lo dije en mi comentario» tampoco se apaga por ningún lado mientras revisa
    expect(css).not.toMatch(/body\.director-trabajando[^{]*\.ya-lo-dije/);
    // «No lo entiendo» sí espera a que termine la revisión
    expect(apagados).toContain('.aclarar-paso');
  });
});

describe('el globo del «?» de las palabras de STL se lee en los dos temas (nota del titular nmw5iky8ytit)', () => {
  it('en el oscuro lleva el texto claro del tema, no la tinta oscura; en el claro sigue igual', () => {
    expect(estilos).toMatch(/html\.oscuro \.globo-palabra \{ color: var\(--texto\); \}/);
    const claro = estilos.match(/^\.globo-palabra \{([^}]*)\}/m)?.[1] ?? '';
    expect(claro).toContain('color: var(--tinta)');
  });
});

describe('«Ya te lo dije en mi comentario» se ve encendido en cuanto se puede usar (nota del titular nmw47cj28tit)', () => {
  it('antes de la visita, solo se apaga lo que tiene «disabled»; el «Ya te lo dije» libre lleva su borde lleno y su color', () => {
    const reglas = [...css.matchAll(/^([^{}\n]*\.en-espera[^{}\n]*)\{([^}]*)\}/gm)].map((m) => ({ selector: m[1].trim(), cuerpo: m[2] }));
    // Ninguna regla de la espera apaga o cambia el color de un botón sin pedir que esté deshabilitado, salvo la que lo enciende
    for (const r of reglas.filter((r) => /opacity|not-allowed|color/.test(r.cuerpo) && r.selector.includes('.boton-opcion'))) {
      expect(r.selector.split(',').every((s) => s.includes(':disabled') || s.includes(':not(:disabled)')), r.selector).toBe(true);
    }
    const encendido = reglas.find((r) => r.selector === '.opciones-paso.en-espera .boton-opcion.ya-lo-dije:not(:disabled)');
    expect(encendido?.cuerpo).toContain('border-style: solid');
    expect(encendido?.cuerpo).toContain('cursor: pointer');
    expect(encendido?.cuerpo).not.toContain('opacity');
  });

  it('al pasar encima o enfocarlo, su texto queda claro sobre el fondo tinta, también en la espera (nota de voz del titular nmw8bspc5tit)', () => {
    // El color de la regla de la espera (cinco clases) pisaba el del hover (cuatro): fondo tinta y texto oscuro en el tema claro
    expect(css).toMatch(/^\.opciones-paso \.boton-opcion:hover, \.opciones-paso \.boton-opcion:focus-visible \{ background: var\(--tinta\); color: #f6e7b4; \}/m);
    expect(css).toContain('.opciones-paso.en-espera .boton-opcion.ya-lo-dije:not(:disabled):hover, .opciones-paso.en-espera .boton-opcion.ya-lo-dije:not(:disabled):focus-visible { color: #f6e7b4; }');
    // Y ninguna otra regla de las opciones que gane al hover le devuelve el color del texto sin pedir que esté apagada o sin el hover
    const conColor = [...css.matchAll(/^([^{}\n]*\.boton-opcion[^{}\n]*)\{([^}]*)\}/gm)]
      .filter((m) => /(^|[^-])color: var\(--(texto|suave)\)/.test(m[2]))
      .flatMap((m) => m[1].split(',').map((s) => s.trim()))
      .filter((s) => (s.match(/\./g) ?? []).length + (s.match(/:not\(/g) ?? []).length >= 4 && !/:disabled|:hover|:focus-visible/.test(s.replace(/:not\(:disabled\)/, '')));
    for (const s of conColor) expect(css, s).toContain(`${s}:hover, ${s}:focus-visible { color: #f6e7b4; }`);
    expect(contraste(TEMAS.claro, '#f6e7b4', 'tinta')).toBeGreaterThanOrEqual(4.5);
    expect(contraste(TEMAS.oscuro, '#f6e7b4', 'tinta')).toBeGreaterThanOrEqual(4.5);
  });
});

describe('el diálogo de la celebración nunca pasa del alto de la ventana (nota de voz del titular, 26 de octubre de 2026)', () => {
  // El «overflow: hidden» que recortaba el confeti recortaba también la lista de misiones aprobadas: en una ventana baja
  // quedaba cortada bajo los botones, sin desplazamiento. Ahora el diálogo es una columna: etiqueta y título arriba,
  // botones abajo, y lo que se desplaza por dentro es la lista
  const regla = (selector: string) => css.match(new RegExp(`^${selector.replace(/[.*+?^${}()|[\]\\>]/g, '\\$&')} \\{[^}]*\\}`, 'm'))?.[0] ?? '';

  it('es una columna con el alto de la ventana por tope, y la lista de misiones se desplaza dentro', () => {
    // El tope es el de todos los diálogos (estilos.css › .dialogo-director), compensado por la escala
    expect(estilos).toMatch(/\.dialogo-director \{[^}]*max-height: calc\(100 \* var\(--vh\) - 48px\)/);
    expect(regla('.celebracion[open]')).toContain('display: flex; flex-direction: column;');
    const formulario = regla('.celebracion form');
    expect(formulario).toContain('display: flex; flex-direction: column;');
    expect(formulario).toContain('min-height: 0');
    expect(formulario).toContain('overflow-y: auto');
    const lista = regla('.celebracion form > .cumplidas');
    expect(lista).toContain('flex: 0 1 auto');
    expect(lista).toContain('min-height: 56px');
    expect(lista).toContain('overflow-y: auto');
    // Lo demás no se encoge: la etiqueta, el título, el nivel, lo que sigue y los botones se ven enteros
    expect(regla('.celebracion form > *')).toContain('flex: none');
  });

  it('los dos diálogos de celebración llevan la lista como hija directa del formulario, antes de los botones', () => {
    const director = readFileSync(join(__dirname, 'app.ts'), 'utf-8').replace(/\r\n/g, '\n');
    const celebraciones = director.split("dlg.className = 'dialogo-director celebracion';").slice(1).map((t) => t.split('</form>')[0]);
    // La de la misión completada ya no es un diálogo: es un aviso a un lado (avisoMision.ts, pd_toast_mision)
    expect(celebraciones).toHaveLength(2);
    for (const c of celebraciones) {
      expect(c).toMatch(/\n {4}<ul class="cumplidas">/);
      expect(c.indexOf('<ul class="cumplidas">')).toBeLessThan(c.indexOf('<div class="botones">'));
      expect(c.trimEnd().endsWith('</div>')).toBe(true);
      // Con la lista desplazable, el navegador la tomaría como lo primero que se puede enfocar (y la dibujaría con su
      // aro): el foco va al primer botón, como siempre
      expect(c).toMatch(/<div class="botones">[^\n]*?<button type="button"[^>]*\bautofocus\b/);
    }
  });

  it('los demás diálogos se desplazan enteros, con los botones pegados abajo: ninguno apaga su desplazamiento', () => {
    expect(estilos).toMatch(/\.dialogo-director \.botones \{\s*position: sticky; bottom: 0;/);
    // «overflow: hidden» en el diálogo mismo era lo que cortaba la celebración (el confeti se recorta en su propia capa)
    const sinDesplazar = [...css.matchAll(/^((?:dialog)?\.[\w.-]+) \{[^}]*overflow: (?:hidden|visible)/gm)]
      .map((m) => m[1])
      .filter((s) => /donde-quedamos|explorador|nuevo-proyecto|dialogo-sonidos|confirmar|falla-revision|dialogo-permiso/.test(s));
    expect(sinDesplazar).toEqual([]);
    expect(regla('.confeti')).toContain('overflow: hidden');
  });
});

describe('la rueda mueve solo lo que está bajo el ratón (nota de voz del titular nmw5mi6xftit)', () => {
  it('con un diálogo modal abierto, la página de atrás se queda quieta y en su lugar', () => {
    expect(estilos).toMatch(/^html:has\(dialog:modal\) \{ overflow: hidden; scrollbar-gutter: stable; \}/m);
    // Sin tocar scrollTo ni la posición: al cerrarse, la página sigue donde estaba
    expect(estilos).not.toMatch(/html:has\(dialog:modal\)[^{]*\{[^}]*(position: fixed|top:)/);
  });

  it('lo que se desplaza dentro de un diálogo no arrastra a la página al llegar a su borde', () => {
    expect(estilos).toMatch(/^dialog \{ overscroll-behavior: contain; \}/m);
    // Solo el diálogo: en cada pieza de adentro, la rueda dejaba de desplazar la conversación (nmw6schrhtit)
    expect(estilos).not.toMatch(/dialog \*[^{]*\{[^}]*overscroll-behavior/);
  });
});

describe('nada se desplaza de lado (nota de voz del titular nmvpt5g33tit, 26 de octubre de 2026: «está prohibido»)', () => {
  // La ventana del modo enfoque mostraba una barra de lado: «overflow-y: auto» vuelve «auto» también el eje de lado, y
  // las nubes de la niebla pasaban un poco del borde. Ninguna interfaz, diálogo, ventana ni tarjeta se desplaza de lado
  const hojas = readdirSync(__dirname).filter((n) => n.endsWith('.css')).map((n) => ({ n, t: readFileSync(join(__dirname, n), 'utf-8') }));
  // El dibujo ampliado es la única excepción: se abre grande a propósito para leer su detalle, y en una pantalla
  // estrecha se recorre como un mapa (dibujos.test.ts)
  const EXCEPCIONES = ['dialog.dibujo-grande .lienzo-grande'];

  it('ninguna regla desplaza de lado, y cada una que desplaza hacia abajo recorta de lado', () => {
    const malas: string[] = [];
    for (const { n, t } of hojas) {
      for (const m of t.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const selector = m[1].replace(/\/\*[\s\S]*?\*\//g, '').trim();
        const cuerpo = m[2];
        if (/overflow-x:\s*(auto|scroll)/.test(cuerpo)) malas.push(`${n} › ${selector}: overflow-x que desplaza`);
        const desplaza = /overflow(-y)?:\s*(auto|scroll)/.test(cuerpo);
        if (desplaza && !/overflow-x:\s*(hidden|clip)/.test(cuerpo) && !EXCEPCIONES.includes(selector)) malas.push(`${n} › ${selector}: le falta overflow-x: hidden`);
      }
    }
    expect(malas).toEqual([]);
  });

  it('ni la página ni un diálogo (que trae del navegador «overflow: auto») se desplazan de lado', () => {
    expect(estilos).toMatch(/^html \{ overflow-x: clip; \}/m);
    expect(estilos).toMatch(/^dialog \{ overflow-x: hidden; \}/m);
  });

  it('nada escrito en el código de la interfaz desplaza de lado', () => {
    const codigo = readdirSync(__dirname).filter((n) => n.endsWith('.ts') && !n.endsWith('.test.ts')).map((n) => readFileSync(join(__dirname, n), 'utf-8'));
    codigo.push(readFileSync(join(__dirname, '..', '..', 'index.html'), 'utf-8'));
    expect(codigo.filter((c) => /overflow(-x)?:\s*(auto|scroll)/.test(c))).toEqual([]);
  });

  it('las tablas y el código de un documento parten sus renglones, y la ruta cabe en el ancho', () => {
    expect(css).toMatch(/\.lector th, \.lector td \{ overflow-wrap: anywhere;/);
    expect(css).toMatch(/\.lector pre \{ white-space: pre-wrap; overflow-wrap: anywhere;/);
    expect(css).toMatch(/\.ruta \{[^}]*repeat\(var\(--fases, 7\), minmax\(0, 1fr\)\)/);
  });
});

/** Las variables de un bloque (`:root {` o `html.oscuro {`, al comienzo de una línea) de una hoja de estilos. */
function variables(hoja: string, bloque: string): Record<string, string> {
  const m = hoja.match(new RegExp(`^${bloque.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\{([^}]*)\\}`, 'm'));
  if (!m) throw new Error(`No encontré «${bloque} {»`);
  return Object.fromEntries([...m[1].matchAll(/--([\w-]+):\s*([^;]+);/g)].map((v) => [v[1], v[2].trim()]));
}
const claro = { ...variables(estilos, ':root'), ...variables(css, ':root') };
const TEMAS = { claro, oscuro: { ...claro, ...variables(estilos, 'html.oscuro'), ...variables(css, 'html.oscuro') } };

/** La luminancia relativa de WCAG 2.x de un color #rgb o #rrggbb. */
function luminancia(hex: string) {
  const h = hex.slice(1).length === 3 ? [...hex.slice(1)].map((c) => c + c).join('') : hex.slice(1);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contraste(tema: Record<string, string>, a: string, b: string) {
  const color = (v: string): string => {
    if (v.startsWith('#')) return v; // un color escrito tal cual
    const x = tema[v];
    if (!x) throw new Error(`Falta --${v}`);
    const ref = x.match(/^var\(--([\w-]+)\)$/);
    return ref ? color(ref[1]) : x;
  };
  const [l1, l2] = [luminancia(color(a)), luminancia(color(b))].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

// Texto normal: 4,5:1. Los bordes de los campos (lo único que los dibuja): 3:1
const TEXTO: [string, string][] = [
  ...['fondo', 'lateral-fondo', 'panel', 'panel-suave'].flatMap((f) => ['texto', 'suave', 'tenue'].map((t): [string, string] => [t, f])),
  ['acento', 'panel'], ['acento', 'panel-suave'],
  ['texto-en-color', 'acento'], ['texto-en-color', 'acento-oscuro'], ['texto-en-color', 'peligro'], ['texto-en-color', 'ok'],
  ['acento-texto', 'acento-fondo'], ['ok-texto', 'ok-fondo'], ['aviso-texto', 'aviso-fondo'], ['peligro-texto', 'peligro-fondo'], ['sobre-texto', 'sobre'],
  ['foco', 'foco-fondo'], ['apoyo', 'apoyo-fondo'], ['espera', 'espera-fondo'], ['espera', 'panel'], ['ok', 'panel'], ['peligro', 'panel'],
  ['oro', 'panel'], ['oro', 'ok-fondo'],
  // lo que se señala (.resaltado): su fondo, bajo cualquier texto de la tarjeta, mientras dura el efecto
  ['texto', 'resalte-fondo'], ['suave', 'resalte-fondo'], ['tenue', 'resalte-fondo'], ['acento', 'resalte-fondo'],
  // la cifra blanca de cada color del reparto del esfuerzo
  ['#ffffff', 'barra-foco'], ['#ffffff', 'barra-apoyo'], ['#ffffff', 'barra-espera'], ['#ffffff', 'barra-otros'],
];
const CONTROLES: [string, string][] = [
  ['borde-control', 'fondo'], ['borde-control', 'panel'], ['borde-control', 'panel-suave'],
  // el borde de los botones de fondo tinta, también sobre el sobre dorado de las decisiones, y la marca de «No aplica»
  ['borde-control', 'sobre'], ['texto-en-color', 'tenue'],
];

describe('los contrastes de los dos temas (nota del titular, 21 de octubre de 2026)', () => {
  it('cada color del tema claro tiene su valor en el oscuro', () => {
    // salvo las barras del reparto, que son las mismas en los dos temas (su cifra es blanca)
    const colores = Object.keys(claro).filter((v) => claro[v].startsWith('#') && !v.startsWith('barra-'));
    const oscuro = { ...variables(estilos, 'html.oscuro'), ...variables(css, 'html.oscuro') };
    expect(colores.filter((v) => !(v in oscuro))).toEqual([]);
  });

  for (const [nombre, tema] of Object.entries(TEMAS)) {
    it(`en el tema ${nombre}, el texto llega a 4,5:1 y los bordes de los campos a 3:1 (WCAG 2.x)`, () => {
      // «no llega» y no «es menor»: así, un color que no se pudo leer (NaN) también falla
      const bajos = [
        ...TEXTO.map(([t, f]) => ({ par: `--${t} sobre --${f}`, r: contraste(tema, t, f), min: 4.5 })),
        ...CONTROLES.map(([t, f]) => ({ par: `--${t} sobre --${f}`, r: contraste(tema, t, f), min: 3 })),
      ].filter((p) => !(p.r >= p.min)).map((p) => `${p.par}: ${p.r.toFixed(2)}:1 (mínimo ${p.min}:1)`);
      expect(bajos).toEqual([]);
    });
  }

  describe('la galaxia en toda la barra (pd_barra_galaxia)', () => {
    const rgb = (hex: string) => {
      const h = hex.slice(1).length === 3 ? [...hex.slice(1)].map((c) => c + c).join('') : hex.slice(1);
      return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
    };
    const aHex = (c: number[]) => `#${c.map((x) => Math.round(x).toString(16).padStart(2, '0')).join('')}`;
    /** Un color semitransparente encima de otro. */
    const encima = (de: number[], alfa: number, sobre: number[]) => de.map((x, i) => x * alfa + sobre[i] * (1 - alfa));
    /** El punto más claro de un cielo: su color de fondo más claro, con todas sus nebulosas encima. */
    const masClaro = (cielo: string) => {
      const fondo = [...cielo.matchAll(/#[0-9a-f]{3,6}/gi)].map((m) => m[0]).sort((a, b) => luminancia(b) - luminancia(a))[0];
      return [...cielo.matchAll(/rgba\((\d+), (\d+), (\d+), ([\d.]+)\)/g)].reduce((c, m) => encima([+m[1], +m[2], +m[3]], +m[4], c), rgb(fondo));
    };
    const franja = (texto: string) => {
      const m = texto.match(/rgb\((\d+) (\d+) (\d+) \/ (\d+)%\)/)!;
      return { color: [+m[1], +m[2], +m[3]], alfa: +m[4] / 100 };
    };
    const lateral = variables(estilos, '.lateral');
    const barra = variables(estilos, '.lateral > :is(.marca, .navegacion, .pie-lateral), .lateral .boton-proyecto');
    const razon = (a: string, b: string) => (Math.max(luminancia(a), luminancia(b)) + 0.05) / (Math.min(luminancia(a), luminancia(b)) + 0.05);

    for (const [nombre, tema] of Object.entries(TEMAS)) {
      it(`en el tema ${nombre}, el texto y los íconos del menú llegan a 4,5:1 sobre el cielo y sobre cada franja`, () => {
        const cielo = masClaro(tema['lv-espacio']);
        const fondos = [cielo, ...['barra-franja', 'barra-franja-sel', 'barra-franja-fija'].map((v) => franja(lateral[v])).map((f) => encima(f.color, f.alfa, cielo))];
        for (const t of ['texto', 'suave', 'tenue']) for (const f of fondos) expect(razon(barra[t], aHex(f))).toBeGreaterThanOrEqual(4.5);
      });
    }

    it('es el mismo cielo en los dos temas, y cada parte lee esas variables, también lo que el tema oscuro pisa', () => {
      expect(TEMAS.oscuro['lv-espacio']).toBe(TEMAS.claro['lv-espacio']);
      expect(estilos).toMatch(/\.lateral \{[^}]*background: var\(--lv-espacio\);/);
      expect(estilos).toMatch(/\.pie-lateral \{[^}]*background: var\(--barra-franja-fija\);/);
      expect(estilos).toContain(':is(html, html.oscuro) .lateral .boton-proyecto { border-color: var(--borde); background: var(--barra-franja-fija); box-shadow: none; }');
      expect(estilos).toContain(':is(html, html.oscuro) .lateral :is(.item-nav, .marca-inicio:not(:disabled)):hover { background: var(--barra-franja); }');
      expect(estilos).toContain(':is(html, html.oscuro) .lateral .item-nav.sel { background: var(--barra-franja-sel); box-shadow: none; color: var(--texto); }');
      // Lo que traía su fondo claro con texto --suave tampoco se queda sin contraste
      expect(estilos).toContain('.lateral .cifra:not(.accion) { background: rgb(255 255 255 / 16%); color: var(--texto); }');
      expect(estilos).toContain('.lateral .insignia.quien:not(.sin) { background: rgb(255 255 255 / 14%); color: var(--texto); }');
      // «Ver como», al pie: su fondo beige con el texto casi blanco de la barra no llegaba a 1,3:1 en el modo claro
      // (nmw6vkqfrtit); sobre la franja oscura (58 % sobre el cielo, unos #0c0c1b), pasa de sobra los 4,5:1
      const equipo = readFileSync(join(__dirname, 'equipo.css'), 'utf-8');
      expect(equipo).toContain('.lateral .vista-equipo:not(.otro) { background: var(--barra-franja-fija); }');
      expect(equipo).toContain('.lateral .vista-equipo.otro :is(select, .ve-solo) { color: var(--aviso-texto); }');
      expect(contraste(TEMAS.claro, '#f7f5ff', '#e9e6dd')).toBeLessThan(4.5);
      expect(contraste(TEMAS.claro, '#f7f5ff', '#0c0c1b')).toBeGreaterThanOrEqual(4.5);
      expect(contraste(TEMAS.claro, 'aviso-texto', 'aviso-fondo')).toBeGreaterThanOrEqual(4.5);
    });

    it('la lista abierta del selector sigue siendo el menú claro: no hereda las variables de la barra (t_decide_galaxia_lista)', () => {
      expect(estilos).toMatch(/\.menu-proyectos \{[^}]*background: var\(--panel\);/);
      const selector = '.lateral > :is(.marca, .navegacion, .pie-lateral), .lateral .boton-proyecto {';
      expect(estilos).toContain(selector);
      // El selector entero no está en la lista de lo que cambia de color: solo su botón, hermano de la lista
      expect(selector).not.toContain('selector-proyecto');
      expect(selector).not.toContain('menu-proyectos');
    });
  });

  it('el resalte toma su fondo del tema: nunca un color claro fijo bajo el texto claro del tema oscuro', () => {
    const resalte = css.match(/@keyframes resalte \{[^\n]*/)?.[0] ?? '';
    expect(resalte).toContain('background-color: var(--resalte-fondo)');
    expect(resalte).not.toMatch(/background-color: #/);
  });

  it('el ejemplo de los campos, la marca de «No aplica» y el reparto toman los colores que se comprueban arriba', () => {
    expect(estilos).toMatch(/::placeholder \{ color: var\(--tenue\)/);
    expect(css).toMatch(/\.criterio\.no_aplica \.marca \{ background: var\(--tenue\)/);
    for (const b of ['foco', 'apoyo', 'espera', 'otros']) expect(css).toContain(`.reparto .${b} { background: var(--barra-${b}); }`);
  });
});
