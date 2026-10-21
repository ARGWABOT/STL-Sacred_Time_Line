import { readFileSync } from 'node:fs';
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

// Texto normal: 4,5:1. Los bordes de los campos (lo único que los dibuja) y las flechas: 3:1
const TEXTO: [string, string][] = [
  ...['fondo', 'lateral-fondo', 'panel', 'panel-suave'].flatMap((f) => ['texto', 'suave', 'tenue'].map((t): [string, string] => [t, f])),
  ['acento', 'panel'], ['acento', 'panel-suave'],
  ['texto-en-color', 'acento'], ['texto-en-color', 'acento-oscuro'], ['texto-en-color', 'peligro'], ['texto-en-color', 'ok'],
  ['acento-texto', 'acento-fondo'], ['ok-texto', 'ok-fondo'], ['aviso-texto', 'aviso-fondo'], ['peligro-texto', 'peligro-fondo'], ['sobre-texto', 'sobre'],
  ['foco', 'foco-fondo'], ['apoyo', 'apoyo-fondo'], ['espera', 'espera-fondo'], ['espera', 'panel'], ['ok', 'panel'], ['peligro', 'panel'],
  ['oro', 'panel'], ['oro', 'ok-fondo'], ['marino', 'fondo'], ['marino', 'panel'], ['marino', 'panel-suave'],
  // lo que se señala (.resaltado): su fondo, bajo cualquier texto de la tarjeta, mientras dura el efecto
  ['texto', 'resalte-fondo'], ['suave', 'resalte-fondo'], ['tenue', 'resalte-fondo'], ['acento', 'resalte-fondo'],
  // la cifra blanca de cada color del reparto del esfuerzo
  ['#ffffff', 'barra-foco'], ['#ffffff', 'barra-apoyo'], ['#ffffff', 'barra-espera'], ['#ffffff', 'barra-otros'],
];
const CONTROLES: [string, string][] = [
  ['borde-control', 'fondo'], ['borde-control', 'panel'], ['borde-control', 'panel-suave'], ['flecha', 'panel'], ['flecha', 'panel-suave'],
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

  it('los colores del gráfico de «Qué es STL» (stl.ts) se leen: cada aporte sobre su fondo y cada fase sobre el blanco a 4,5:1, y cada actor bajo su ícono blanco a 3:1', () => {
    const stl = readFileSync(join(__dirname, 'stl.ts'), 'utf-8');
    const r = (a: string, b: string) => contraste({}, a, b);
    const aportes = [...stl.matchAll(/color: '(#[0-9a-f]{6})', fondo: '(#[0-9a-f]{6})'/g)];
    const fases = [...(stl.match(/^const FASES.*$/m)?.[0] ?? '').matchAll(/'(#[0-9a-f]{6})'/g)].map((m) => m[1]);
    const actores = Object.fromEntries([...(stl.match(/^const COLOR = \{.*$/m)?.[0] ?? '').matchAll(/(\w+): '(#[0-9a-f]{6})'/g)].map((m) => [m[1], m[2]]));
    expect([aportes.length, fases.length, Object.keys(actores).length]).toEqual([4, 4, 8]);
    const bajos = [
      ...aportes.filter(([, c, f]) => !(r(c, f) >= 4.5)).map(([, c, f]) => `aporte ${c} sobre ${f}: ${r(c, f).toFixed(2)}:1`),
      ...fases.filter((c) => !(r(c, '#ffffff') >= 4.5)).map((c) => `fase ${c}: ${r(c, '#ffffff').toFixed(2)}:1`),
      // el nombre de cada momento va en el color de su actor, sobre el papel suave (el tenue solo va bajo un ícono)
      ...Object.entries(actores).filter(([n, c]) => n !== 'tenue' && !(r(c, '#fbfaf7') >= 4.5)).map(([n, c]) => `actor ${n} (${c}): ${r(c, '#fbfaf7').toFixed(2)}:1`),
      ...Object.entries(actores).filter(([, c]) => !(r(c, '#ffffff') >= 3)).map(([n, c]) => `ícono de ${n} (${c}): ${r(c, '#ffffff').toFixed(2)}:1`),
    ];
    expect(bajos).toEqual([]);
  });
});
