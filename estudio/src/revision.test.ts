import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { paroVigente } from './pestanasDq';
import { es } from './textos/es';
import { abrirAlCargar } from './trabajando';

const director = readFileSync(join(__dirname, 'app.ts'), 'utf-8');
const tramo = (desde: string, hasta: string) => director.slice(director.indexOf(desde), director.indexOf(hasta, director.indexOf(desde)));

describe('«Pedir revisión» nunca mientras un director vive (nota de voz del titular, 22 de octubre de 2026)', () => {
  it('la cabecera pone, en lugar del botón, qué corre y por qué, sin clic', () => {
    const boton = tramo('function botonRevision', 'async function mostrarFalla');
    const ocupado = boton.indexOf('if (ocupado) return');
    expect(ocupado).toBeGreaterThan(0);
    // El estado va antes del botón, y no lleva nada que pida
    expect(ocupado).toBeLessThan(boton.indexOf('data-revision="pedir" title='));
    expect(boton.slice(ocupado, boton.indexOf('\n', ocupado))).not.toContain('data-revision');
    // «Retomarla», de una revisión fallida, tampoco (pr_retoma_automatica, punto 2: retoma lo que esa dejó hecho)
    expect(boton).toContain("r?.error && !ocupado ? `<button type=\"button\" class=\"enlace\" title=\"${esc(tx('falla.retomarTitulo'))}\" data-revision=\"pedir\">${tx('cabeza.retomarla')}");
    expect(es['falla.retomarTitulo']).toBe('La pide otra vez: retoma lo que esta dejó hecho, sin rehacerlo, y termina lo que falta');
  });

  it('dice si es el de este proyecto, que termina lo último, o uno de otro proyecto, con su porqué', () => {
    const f = tramo('function directorOcupado', 'function minutosSinActividad');
    expect(f).toContain("tx('ocupado.terminaUltimo')");
    expect(f).toContain("tx('ocupado.otroProyectoCorto')");
    expect(f).toContain("tx('ocupado.vuelve')");
    expect(es['ocupado.terminaUltimo']).toBe('El director termina lo último');
    expect(es['ocupado.otroProyectoCorto']).toBe('Un director trabaja en otro proyecto');
    expect(es['ocupado.vuelve']).toContain('a la vez');
  });

  it('ni el diálogo de la entrega, ni el de la revisión fallida, ni ningún otro camino la piden con un director vivo', () => {
    const entrega = tramo('async function completarSiToca', 'async function nuevoProyecto');
    expect(entrega).toMatch(/const enMarcha = revisando\(\) \|\| !!ocupado/);
    const falla = tramo('async function mostrarFalla', 'async function pedirAclaracion');
    expect(falla).toContain("${ocupado ? '' : `<button type=\"button\" data-nota");
    const pedir = tramo('async function pedirLaRevision', 'function pintarNavegacion');
    expect(pedir.indexOf('directorOcupado()')).toBeLessThan(pedir.indexOf('fetch('));
  });
});

describe('Quedarse sin misiones no pide la revisión (nota de voz del titular, 22 de octubre de 2026)', () => {
  it('la entrega de una misión, aunque sea la última, no la pide ni la ofrece: solo dice dónde pedirla, cuando quiera', () => {
    const entrega = tramo('async function completarSiToca', 'async function nuevoProyecto');
    expect(entrega).not.toContain('pedirLaRevision');
    expect(entrega).not.toContain('data-pedir');
    expect(entrega).toContain("tx('entrega.pideCuandoQuieras')");
    expect(es['entrega.pideCuandoQuieras']).toBe('Pide la revisión cuando quieras.');
    expect(entrega).not.toContain('sin ella, no hay misión nueva');
  });
});

describe('«Pedir revisión» resaltado cuando es lo único que te queda (nota de voz del titular nmvsxwjdxtit, 28 de octubre de 2026)', () => {
  it('la cabecera le pone «recomendado» con pedirEsLoUnico, y el estilo lo hace latir sin moverlo, salvo con menos movimiento', () => {
    const boton = tramo('function botonRevision', 'async function mostrarFalla');
    expect(boton).toContain('const unico = !!d.identidad.rol && pedirEsLoUnico(ctx(), d.identidad.rol, d.arranque);');
    expect(boton).toContain("class=\"boton-suave pedir-revision${unico ? ' recomendado' : ''}\"");
    const css = readFileSync(join(__dirname, 'director.css'), 'utf-8');
    expect(css).toMatch(/\.pedir-revision\.recomendado \{[^}]*animation: latido/);
    expect(css).toMatch(/prefers-reduced-motion: reduce\) \{ \.pedir-revision\.recomendado \{ animation: none/);
  });
});

describe('Cuando el director se detiene, el porqué, «¿Dónde quedamos?» y la misión, estés donde estés (pedido pd_parada_visible)', () => {
  it('al recargar porque terminó una revisión, «¿Dónde quedamos?» se abre siempre, no solo tras horas sin verlo', () => {
    const arranque = tramo('cargarAlArrancar()', "const v = pedido.get('vista')");
    expect(arranque).toContain('const termino = !!sessionStorage.getItem(CLAVE_TERMINO)');
    expect(arranque).toContain("const abrir = abrirAlCargar({ termino, tocaResumen: tocaResumen() && (!!d.plan.resumen || d.arranque === 'en_marcha'), mirar: pedido.has('mirar') });");
    // En su orden: el reporte de lo cumplido y, al cerrarlo, «¿Dónde quedamos?» (nmvvmc5rxtit)
    expect(arranque).toContain("for (const x of abrir) await (x === 'celebracion' ? celebrarSiToca(abrir.includes('dondeQuedamos')) : mostrarDondeQuedamos());");
    // Y desde ahí, su botón lleva a la tarjeta de la misión de ahora
    const dq = tramo('async function mostrarDondeQuedamos', 'function informeNegadosDq');
    expect(dq).toContain('data-a-mision');
  });

  it('al terminar la revisión, la voz de «¿Dónde quedamos?» empieza a prepararse antes de la recarga, con el mismo HTML con que se abre (pd_voz_dq_al_cerrar)', () => {
    const carga = tramo('async function cargar(', 'const CLAVE_TERMINO');
    expect(carga).toMatch(/if \(tras === 'ya'\) \{\n\s*recargarLaRevision\(\);/);
    const recargar = tramo('function recargarLaRevision', 'function conReinicioDelServidor');
    expect(recargar).toMatch(/prepararDondeQuedamos\(\);\n\s*sessionStorage\.setItem\(CLAVE_TERMINO, '1'\);\n\s*recargarConCuenta\(/);
    const preparar = tramo('function prepararDondeQuedamos', 'function htmlDondeQuedamos');
    expect(preparar).toContain('prepararDeAntemano([cajaDondeQuedamos()]);');
    expect(preparar).toContain('const cajaDondeQuedamos = () => `<dialog class="${CLASE_DQ}">${htmlDondeQuedamos().html}</dialog>`;');
    // El diálogo que se abre se arma con lo mismo: lo preparado es lo que suena
    const dq = tramo('async function mostrarDondeQuedamos', 'function prepararDondeQuedamos');
    expect(dq).toContain('const { html, est, mia, porDecidir } = htmlDondeQuedamos();');
    expect(dq).toContain('dlg.className = CLASE_DQ;');
    expect(dq).toContain('prepararLoQueSigue(dlg);');
  });

  it('la voz de lo que viene empieza al salir el reporte de lo cumplido, sin abrir «¿Dónde quedamos?» (nmvzfcm2htit)', () => {
    const arranque = tramo('cargarAlArrancar()', "const v = pedido.get('vista')");
    const prepara = arranque.indexOf("if (abrir.length) prepararLoQueSigue(abrir.includes('dondeQuedamos') ? cajaDondeQuedamos() : undefined);");
    const abre = arranque.indexOf("for (const x of abrir) await (x === 'celebracion'");
    expect(prepara).toBeGreaterThan(-1);
    // Antes del reporte, que puede quedar horas abierto esperando a que lo cierres
    expect(prepara).toBeLessThan(abre);
    // Con ?mirar nada se abre y nada se prepara
    expect(abrirAlCargar({ termino: true, tocaResumen: true, mirar: true })).toEqual([]);
    expect(abrirAlCargar({ termino: true, tocaResumen: false, mirar: false })).toEqual(['celebracion', 'dondeQuedamos']);
    // «¿Dónde quedamos?» va delante de lo que «Hoy» ya puso en la cola
    expect(tramo('function prepararLoQueSigue', 'const documentosDeMision')).toContain('if (dlg) prepararDelante(dlg);');
  });

  it('el porqué de la parada va lo primero de «¿Dónde quedamos?», también si llega con el diálogo ya abierto', () => {
    const dq = tramo('async function mostrarDondeQuedamos', 'function informeNegadosDq');
    expect(dq.indexOf('lineaDeParo(paro)')).toBeGreaterThan(dq.indexOf('dq-cabeza'));
    expect(dq.indexOf('lineaDeParo(paro)')).toBeLessThan(dq.indexOf('dq-quedamos'));
    const carga = tramo('async function cargar(', 'const CLAVE_TERMINO');
    expect(carga).toContain("cabeza.querySelector('h2')?.insertAdjacentHTML('afterend', lineaDeParo(paroNuevo))");
    // Sin el diálogo abierto, se avisa en ese momento, con el botón a «¿Dónde quedamos?»
    expect(carga).toMatch(/avisar\(tx\('aviso\.seguidasPararon', \{ porque: paroNuevo\.porque \}\)[^\n]*mostrarDondeQuedamos/);
    expect(es['aviso.seguidasPararon']).toBe('Las revisiones seguidas pararon: {porque}');
  });

  it('el porqué de la parada es un ícono que se abre con un clic, no una franja roja a la vista (nmvt0g2rrtit)', () => {
    // Junto al título, en la cabecera: un <details> cuyo resumen es solo el ícono, y el porqué como menú contextual
    const linea = tramo('const lineaDeParo', 'const DETENER_TRAS_MIN');
    expect(linea).toContain('<details class="dq-paro"><summary');
    expect(linea).toContain("${icono('info')}</summary>");
    expect(linea).toContain('class="dq-paro-menu"');
    expect(linea).not.toContain('alerta-p');
    const dq = tramo('async function mostrarDondeQuedamos', 'function informeNegadosDq');
    expect(dq.indexOf('lineaDeParo(paro)')).toBeLessThan(dq.indexOf('${opcionesDq()}</div>'));
    const css = readFileSync(join(__dirname, 'director.css'), 'utf-8');
    expect(css).toMatch(/\.dq-paro-menu \{[^}]*position: absolute/);
    expect(css).toMatch(/\.dq-paro summary \{[^}]*list-style: none/);
  });

  it('la parada se ve solo hasta que se pide o se lanza otra revisión, sola o seguida, no por horas (nmvtinjrvtit)', () => {
    const paro = { cuando: '2026-10-29T10:00:00.000Z', porque: 'algo te necesita' };
    // Sin revisión nueva, sigue a la vista aunque pasen días
    expect(paroVigente(paro, { pedida: '2026-10-29T09:00:00.000Z', lanzada: '2026-10-29T09:00:05.000Z' })).toBe(paro);
    expect(paroVigente(paro, null)).toBe(paro);
    // Con otra pedida, lanzada o en curso después de la parada, se va
    expect(paroVigente(paro, { pedida: '2026-10-29T11:00:00.000Z' })).toBeNull();
    expect(paroVigente(paro, { pedida: '2026-10-29T09:00:00.000Z', enCurso: '2026-10-29T11:00:00.000Z' })).toBeNull();
    expect(paroVigente(undefined, { pedida: '2026-10-29T11:00:00.000Z' })).toBeNull();
    // La cabecera y «¿Dónde quedamos?» lo leen de ahí, sin un reloj de horas
    expect(director).toContain('return paroVigente(d?.seguidas?.paro, d?.revision);');
    expect(director).not.toContain('PARO_VISIBLE_H');
  });

  it('el aviso de la cabecera es corto, para no tapar «¿Dónde quedamos?», y su «¿Por qué?» lo abre', () => {
    const cadena = tramo('function cadenaDeRevisiones', 'function botonRevision');
    const paro = cadena.slice(cadena.indexOf('if (!paroReciente())'));
    expect(paro).toContain('${tx(\'seguidas.pararon\')}<button type="button" class="enlace" data-donde-quedamos>${tx(\'cabeza.porQue\')}</button>');
    expect(es['seguidas.pararon']).toBe('Las seguidas pararon');
    expect(es['cabeza.porQue']).toBe('¿Por qué?');
    expect(paro).not.toContain('Las seguidas pararon: ${esc(s.paro.porque)}');
  });
});

describe('«¿Dónde quedamos?» y lo que va haciendo el director, sin moverte lo que lees (notas nmvt24ea2tit y nmvt1hcjutit)', () => {
  const css = readFileSync(join(__dirname, 'director.css'), 'utf-8');

  it('la línea de los controles nunca baja por el ícono de la parada: el diálogo es más ancho y el título se ajusta', () => {
    expect(css).toContain('.donde-quedamos { width: min(820px, calc(100 * var(--vw) - 32px)); }');
    expect(css).toContain('.dq-cabeza { display: flex; flex-wrap: nowrap;');
    expect(css).toContain('.dq-cabeza h2 { margin: 0; flex: 1 1 auto; min-width: 0; overflow-wrap: anywhere; }');
    expect(css).toContain('.dq-cabeza > :not(h2) { flex: none; }');
    // Solo en un teléfono pasan a otra línea
    expect(css).toContain('@media (max-width: 600px) { .dq-cabeza { flex-wrap: wrap; } }');
  });

  it('el plan de la revisión, abierto, sigue donde lo leías aunque cada consulta repinte el panel', () => {
    const pintar = tramo('function pintarProgreso(', 'function planVivoHtml(');
    expect(pintar.indexOf("const planAntes = caja.querySelector<HTMLElement>('.plan-vivo ol')?.scrollTop ?? 0;")).toBeGreaterThan(0);
    expect(pintar.indexOf('const planAntes')).toBeLessThan(pintar.indexOf('caja.innerHTML ='));
    expect(pintar.indexOf('listaPlan.scrollTop = planAntes;')).toBeGreaterThan(pintar.indexOf('caja.innerHTML ='));
  });
});
