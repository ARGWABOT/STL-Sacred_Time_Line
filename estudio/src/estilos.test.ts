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

  it('los tres diálogos de celebración llevan la lista como hija directa del formulario, antes de los botones', () => {
    const director = readFileSync(join(__dirname, 'director.ts'), 'utf-8').replace(/\r\n/g, '\n');
    const celebraciones = director.split("dlg.className = 'dialogo-director celebracion';").slice(1).map((t) => t.split('</form>')[0]);
    expect(celebraciones).toHaveLength(3);
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
      .filter((s) => /donde-quedamos|explorador|nuevo-proyecto|preguntas-dialogo|dialogo-sonidos|confirmar|falla-revision|dialogo-permiso/.test(s));
    expect(sinDesplazar).toEqual([]);
    expect(regla('.confeti')).toContain('overflow: hidden');
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
