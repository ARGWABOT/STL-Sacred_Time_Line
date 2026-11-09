import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { queHaceCentral } from './guiaLectura';
import { es } from './textos/es';
import { pestanaActiva } from './pestanasDq';
import { CARA_DEL_DIRECTOR, clicDelCentral, DQ_EN_HOY, oprimirComoCentral, elegirSiguiente, ENFOCAR_EN_HOY, irDelPasoSigue, leTocaALaCara, PRIMERO_EN_HOY, LINEA_POR_MARCAR, NUNCA, SIGUIENTE, ventanaDelCentral } from './siguiente';

const leer = (ruta: string) => readFileSync(join(__dirname, ruta), 'utf-8').replace(/\r\n/g, '\n');
const c = (x: Partial<{ visible: boolean; aLaVista: boolean; nunca: boolean; espera: boolean }> = {}) => ({ visible: true, aLaVista: true, nunca: false, espera: false, ...x });

// Tras la revisión, leído «¿Dónde quedamos?», el botón central oprimía «Ir a lo que sigue →» y llegaba a la tarjeta de la
// misión sin el modo enfoque: el siguiente clic central avanzaba dentro de ella (nota de voz del titular nmw0ysgrytit, 3 de
// noviembre de 2026). Con el botón central, ese botón abre la misión en modo enfoque
describe('el autoavance de «¿Dónde quedamos?» a tu misión, en modo enfoque (nmw0ysgrytit)', () => {
  it('quien recibe un clic del botón central lo sabe mientras lo atiende, y uno con el ratón normal no', () => {
    const vistos: boolean[] = [];
    oprimirComoCentral({ click: () => vistos.push(clicDelCentral()) });
    vistos.push(clicDelCentral());
    expect(vistos).toEqual([true, false]);
    // Si el clic falla, no queda marcado
    expect(() => oprimirComoCentral({ click: () => { throw new Error('x'); } })).toThrow();
    expect(clicDelCentral()).toBe(false);
  });

  it('el botón central oprime así; «Ir a lo que sigue →» de «¿Dónde quedamos?» lleva a la misión y, con el central, pone el enfoque', () => {
    expect(leer('siguiente.ts')).toContain('oprimido = true;\n  oprimirComoCentral(b);');
    const app = leer('app.ts');
    expect(app).toContain('if (b.dataset.aMision !== undefined && mia) void terminar(tarjetaDe(mia), clicDelCentral());');
    const terminar = app.slice(app.indexOf('const terminar = async (destino?: Destino, enfocar = false)'), app.indexOf("dlg.addEventListener('click'", app.indexOf('const terminar = async (destino?: Destino, enfocar = false)')));
    expect(terminar.indexOf('if (destino) await ir(destino);')).toBeLessThan(terminar.indexOf("if (enfocar && vista === 'misiones') quererEnfoque(true);"));
  });
});

describe('el botón central del ratón, como el «Enter» del Studio (notas de voz del titular nmvofmvg7tit y nmvofnunstit)', () => {
  it('mira la ventana donde se oprimió: el diálogo, lo enfocado o la página; nunca lo que tapa un diálogo', () => {
    expect(ventanaDelCentral({ enDialogo: true, modalAbierto: true, enfoque: 'mision' })).toBe('dialogo');
    // Fuera del diálogo que está encima, nada: lo de abajo no se toca
    expect(ventanaDelCentral({ enDialogo: false, modalAbierto: true, enfoque: '' })).toBeNull();
    expect(ventanaDelCentral({ enDialogo: false, modalAbierto: false, enfoque: 'mision' })).toBe('mision');
    expect(ventanaDelCentral({ enDialogo: false, modalAbierto: false, enfoque: 'documento' })).toBe('documento');
    expect(ventanaDelCentral({ enDialogo: false, modalAbierto: false, enfoque: '' })).toBe('pagina');
  });

  it('oprime el primero que se ve, que no es de los prohibidos y que no espera nada; en la página, solo si está a la vista', () => {
    expect(elegirSiguiente([c({ visible: false }), c({ nunca: true }), c({ espera: true }), c()], 'dialogo')).toBe(3);
    expect(elegirSiguiente([c({ aLaVista: false })], 'pagina')).toBe(-1);
    // En una ventana (un diálogo o lo enfocado) cuenta aunque haya que desplazarla para verlo
    expect(elegirSiguiente([c({ aLaVista: false })], 'mision')).toBe(0);
    expect(elegirSiguiente([], 'dialogo')).toBe(-1);
  });

  it('nunca pide una revisión, ni borra, ni cruza una puerta: solo lo marcado, y lo marcado nunca es eso', () => {
    for (const x of ['[data-revision]', '[data-pedir]', '[data-sin-ultracode]', '[data-cruzar]', '.peligro', ':disabled']) expect(NUNCA).toContain(x);
    expect(SIGUIENTE).toBe('[data-siguiente], .trozo.actual .entendido:not(.hecho), .dq-panel:not([hidden]) .dq-seccion .dq-item:not(.leida, .tachando)');
    // La página y la tarjeta de la misión, que salió a su módulo (missionCard.ts, pr_partir_modulos)
    const director = `${leer('app.ts')}\n${leer('missionCard.ts')}`;
    const marcados = director.split('\n').filter((l) => /data-siguiente(?!-tras)/.test(l) || l.includes('${siguiente}') || l.includes('${SIGUE_AL_DIA}'));
    expect(marcados.length).toBeGreaterThanOrEqual(6);
    for (const l of marcados) expect(l, l).not.toMatch(/data-revision|data-pedir|data-sin-ultracode|data-cruzar|peligro|Autorizo|confirmar\(/);
  });

  it('lleva a lo que sigue en las ventanas que el titular nombró', () => {
    const director = leer('app.ts');
    // Al terminar de leer un documento, «Ir a mi misión →»; al completar una misión ya no hay ventana que oprimir: un aviso
    // a un lado que se va solo (avisoMision.ts, pd_toast_mision)
    expect(director).toContain('<button type="button" class="primario" data-seguir data-siguiente>${tx(\'mision.irAMiMision\')}</button>');
    expect(es['mision.irAMiMision']).toBe('Ir a mi misión →');
    expect(director).not.toContain('<button type="button" class="primario" data-cerrar data-siguiente autofocus>Entendido</button>');
    // En la tarjeta de la misión de ahora (missionCard.ts), «Continuar en modo enfoque» o «Entregar al director»
    const tarjeta = leer('missionCard.ts');
    expect(tarjeta).toContain("const siguiente = numero === 1 && mia ? ' data-siguiente' : '';");
    expect(tarjeta).toContain('data-continuar="${esc(m.id)}|${sigue}|enfoque"${siguiente}');
    expect(tarjeta).toContain('data-entregar="${esc(m.id)}"${siguiente}');
    // En «¿Dónde quedamos?», solo cuando ya marcaste todas sus líneas
    expect(director).toContain(`const SIGUE_AL_DIA = ' data-siguiente data-siguiente-tras=".dq-seccion .dq-item:not(.leida)"';`);
    expect(director).toContain('data-a-mision${SIGUE_AL_DIA}');
    expect(director).toContain("import { clicDelCentral, irDelPasoSigue } from './siguiente';");
  });

  it('en «Hoy», esté donde esté el cursor, abre tu misión de ahora en modo enfoque, antes que lo marcado en la página (pd_central_hoy, notas nmvveszr9tit y nmvvk48q0tit)', () => {
    const siguiente = leer('siguiente.ts');
    const boton = siguiente.match(/function botonSiguiente\(t: HTMLElement\): HTMLElement \| null \{[\s\S]*?\n\}/)?.[0] ?? '';
    // En la página, el botón «Modo enfoque» marcado va primero, sin mirar lo que hay bajo el cursor ni si está a la vista
    expect(ENFOCAR_EN_HOY).toBe('[data-central-enfoque]:not([hidden])');
    expect(boton.indexOf("if (ventana === 'pagina') {")).toBeGreaterThan(-1);
    expect(boton.indexOf("if (ventana === 'pagina') {")).toBeLessThan(boton.indexOf('const raiz ='));
    expect(boton).toContain('for (const que of PRIMERO_EN_HOY) {');
    expect(boton).toContain('document.querySelectorAll<HTMLElement>(que)');
    expect(PRIMERO_EN_HOY).toContain(ENFOCAR_EN_HOY);
    // Lo marca el Studio solo donde hay una misión tuya que enfocar, sin el enfoque puesto, y nunca en la salida del enfoque
    const director = leer('app.ts');
    expect(director).toContain("b.toggleAttribute('data-central-enfoque', !si && aqui.startsWith('mision-') && !b.classList.contains('salida-enfoque'));");
    // Y ese botón solo pone o quita el enfoque: no pide nada, no borra, no decide
    expect(director).toContain("if ((e.target as HTMLElement).closest('[data-enfoque]')) quererEnfoque(!enfoque);");
  });

  it('en «Hoy», mientras «¿Dónde quedamos?» tenga líneas por leer, lo abre a él antes que tu misión (nota de voz nmvvlhs55tit)', () => {
    // Primero lo que dejó el director; con todo leído, la misión en modo enfoque, como antes
    expect(DQ_EN_HOY).toBe('[data-central-dq]:not([hidden])');
    expect([...PRIMERO_EN_HOY]).toEqual([DQ_EN_HOY, ENFOCAR_EN_HOY]);
    // El Studio marca su botón de arriba solo en «Hoy» y solo con algo por leer; ese botón solo abre «¿Dónde quedamos?»
    const director = leer('app.ts');
    expect(director).toContain("data-donde-quedamos${nv.sinLeer && vista === 'misiones' ? ' data-central-dq' : ''} title=");
    expect(director).toContain("if ((e.target as HTMLElement).closest('[data-donde-quedamos]')) return void mostrarDondeQuedamos();");
    // Al cerrarlo, la cabecera se vuelve a pintar: con todo leído, la marca se va y el botón central vuelve a la misión
    const dq = director.match(/async function mostrarDondeQuedamos\(\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(dq).toContain('pintarMando();');
  });

  it('destapada la niebla de la tarjeta, lleva a donde pide el paso de ahora, pero nunca elige una opción (nota nmvvkdkfytit)', () => {
    // Ir a donde pide: una propuesta, una vista o una página; un documento ya lo lleva «Continuar en modo enfoque»
    expect(irDelPasoSigue({ deAhora: true, doc: false, hecho: false, abierto: false })).toBe(true);
    expect(irDelPasoSigue({ deAhora: true, doc: true, hecho: false, abierto: false })).toBe(false);
    // Ya se fue a mirar: lo que sigue es contar cómo fue, no volver a ir; salvo un paso que se marca solo al hacerlo
    expect(irDelPasoSigue({ deAhora: true, doc: false, hecho: false, abierto: true })).toBe(false);
    expect(irDelPasoSigue({ deAhora: true, doc: false, hecho: true, abierto: true })).toBe(true);
    // Solo el paso de ahora de tu misión de ahora
    expect(irDelPasoSigue({ deAhora: false, doc: false, hecho: false, abierto: false })).toBe(false);
    const director = leer('app.ts');
    expect(leer('missionCard.ts')).toContain('${listaPasos(m, numero === 1 && mia)}');
    expect(director).toContain('listaDePasos(m, true, [sigue], deAhora ? sigue : -1)');
    expect(director).toContain('irDelPaso(m, i, destinoDelPaso(p, m)!, conCasillas && !hechos.has(i), p.esperar, i === central)');
    // Las opciones de un paso nunca llevan lo que oprime el botón central
    const opciones = director.match(/function opcionesSinElegir\([\s\S]*?\n\}/)?.[0] ?? '';
    expect(opciones).not.toContain('data-siguiente');
    // La niebla de la tarjeta va primero: mientras quede algo por destapar, el botón central es suyo
    expect(queHaceCentral({ avanza: false, porDestapar: true, entendido: false })).toBe('avanzar');
  });

  it('en «¿Dónde quedamos?» lleva toda la lectura: destapa, marca lo leído en orden, pasa a la pestaña siguiente y al final va a lo que sigue (pd_central_pestana)', () => {
    // 1. Mientras quede algo por destapar, la niebla lo lee (guiaLectura.ts mira antes y lo toma)
    expect(queHaceCentral({ avanza: false, porDestapar: true, entendido: false })).toBe('avanzar');
    // 2. Sin nada por destapar, la niebla lo deja: el botón central marca la primera línea sin marcar de la pestaña abierta
    expect(queHaceCentral({ avanza: false, porDestapar: false, entendido: false })).toBe('nada');
    expect(LINEA_POR_MARCAR).toBe('.dq-panel:not([hidden]) .dq-seccion .dq-item:not(.leida, .tachando)');
    expect(SIGUIENTE).toContain(LINEA_POR_MARCAR);
    // Las líneas van antes que el botón del diálogo, que espera mientras quede alguna: se marcan en orden, una por clic
    const director = leer('app.ts');
    const dialogo = director.match(/function htmlDondeQuedamos\(\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(dialogo.indexOf('${lecturaDq(est)}')).toBeGreaterThan(-1);
    expect(dialogo.indexOf('${lecturaDq(est)}')).toBeLessThan(dialogo.indexOf('data-a-mision${SIGUE_AL_DIA}'));
    const linea = (marcada = false) => c({ espera: marcada });
    const irALoQueSigue = (quedan: number) => c({ espera: quedan > 0 });
    expect(elegirSiguiente([linea(), linea(), irALoQueSigue(2)], 'dialogo')).toBe(0);
    // 3. Al quedar completa la pestaña, el diálogo abre la siguiente que tenga algo por leer, en su orden, y ahí se vuelve a leer
    expect(pestanaActiva(['falla', 'idea'], 'ajuste')).toBe('falla');
    expect(director).toContain('mostrarPestanaDq(dlg, pestanaActiva(conAlgo, abierta) ?? abierta ?? null);');
    // 4. Sin nada por marcar en ninguna pestaña, el botón principal del diálogo: «Ir a lo que sigue →»
    expect(elegirSiguiente([irALoQueSigue(0)], 'dialogo')).toBe(0);
    expect(director).toContain(`const SIGUE_AL_DIA = ' data-siguiente data-siguiente-tras=".dq-seccion .dq-item:not(.leida)"';`);
  });

  it('sin niebla ni nada marcado que oprimir, hace lo de la carita del director: a tu misión de ahora (nota de voz nmvzo1jxhtit)', () => {
    const cara = { visible: true, nunca: false };
    // Con un botón marcado, ese: la carita es el último recurso
    expect(elegirSiguiente([c()], 'pagina')).toBe(0);
    // Sin ninguno, en una sección como «Modelo y consumo» o en lo enfocado, le toca a ella
    expect(elegirSiguiente([], 'pagina')).toBe(-1);
    expect(leTocaALaCara('pagina', cara)).toBe(true);
    expect(leTocaALaCara('documento', cara)).toBe(true);
    expect(leTocaALaCara('mision', cara)).toBe(true);
    // Nunca dentro de un diálogo, ni con uno modal encima, ni si no se ve o está entre lo que nunca se oprime
    expect(leTocaALaCara('dialogo', cara)).toBe(false);
    expect(leTocaALaCara(ventanaDelCentral({ enDialogo: false, modalAbierto: true, enfoque: '' }), cara)).toBe(false);
    expect(leTocaALaCara('pagina', { visible: false, nunca: false })).toBe(false);
    expect(leTocaALaCara('pagina', { visible: true, nunca: true })).toBe(false);
    // Es el orden del código: la niebla ya miró antes (no llega aquí), lo marcado va primero, la carita al final; y oprime la carita de verdad
    const siguiente = leer('siguiente.ts');
    const boton = siguiente.match(/function botonSiguiente\(t: HTMLElement\): HTMLElement \| null \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(boton.indexOf('if (!ventana) return null;')).toBeLessThan(boton.indexOf('if (i >= 0) return botones[i];'));
    expect(boton.indexOf('if (i >= 0) return botones[i];')).toBeLessThan(boton.indexOf('document.querySelector<HTMLElement>(CARA_DEL_DIRECTOR)'));
    expect(CARA_DEL_DIRECTOR).toBe('#director-flotante .df-cara');
    const equipo = leer('equipo.ts');
    expect(equipo).toContain("flotante.id = 'director-flotante';");
    expect(equipo).toMatch(/flotante\.querySelector\('\.df-cara'\)!\.addEventListener\('click', \(\) => \{[\s\S]{0,60}llevar\(\);/);
  });

  it('la niebla de lectura va primero, y deja el botón central cuando no tiene nada que hacer', () => {
    const guia = leer('guiaLectura.ts');
    const central = guia.match(/function conBotonCentral\(e: MouseEvent\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    // Sin nada que hacer en la lectura, no lo toma (ni le quita al navegador lo suyo): queda para lo que sigue
    expect(central.indexOf("if (hace === 'nada') return;")).toBeGreaterThan(-1);
    expect(central.indexOf("if (hace === 'nada') return;")).toBeLessThan(central.indexOf('e.preventDefault();\n  centralTomado = true;'));
    // La niebla escucha en el documento y lo que sigue en la ventana, que oye después; y no oprime lo que la niebla ya usó
    expect(guia).toContain("document.addEventListener('mousedown', conBotonCentral);");
    const siguiente = leer('siguiente.ts');
    expect(siguiente).toContain("addEventListener('mousedown', conBotonCentral);");
    expect(siguiente).not.toContain("document.addEventListener('mousedown'");
    expect(siguiente).toContain('if (e.defaultPrevented) return;');
  });
});

describe('la franja de arriba de la misión en su modo enfoque (nota de voz del titular nmvofr7x3tit)', () => {
  it('lleva el tema y la niebla, con su ▶ y su velocidad, como la del documento', () => {
    const director = leer('app.ts');
    // En cuatro grupos, los mismos de la franja del documento (enfoque.test.ts): sin la letra, que es del documento
    expect(director).toContain("<span class=\"opciones-mision\" role=\"group\" aria-label=\"${esc(tx('dq.comoLeer'))}\">${controlesEnfoque({ tema: botonTema(), niebla: controlAuto('niebla'), narracion: controlAuto('voz'), sonido: botonSonido() })}</span>");
    // Con el «?» de «misión» junto a su nombre (pr_palabras)
    expect(leer('missionCard.ts')).toContain('<div class="franja-mision"><span class="sigue-esta">${t(\'mision.ahora\')}${conAyuda(\'mision\')}</span>${mia ? opcionesMision() : \'\'}</div>');
    const css = leer('director.css');
    expect(css).toContain('html.enfoque-mision .mision-c.sigue.mia .opciones-mision { display: flex; }');
    expect(css).toContain('html.enfoque-mision .mision-c.sigue.mia .franja-mision { position: sticky; top: 0; z-index: 3;');
    // La nube se ve ahí, como en el documento y en «¿Dónde quedamos?»
    expect(leer('guiaLectura.css')).toContain('html.enfoque-mision .mision-c.sigue.mia .gl-niebla,');
  });
});
