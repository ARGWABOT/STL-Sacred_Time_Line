// Nada se corta (pedido del titular pd_nada_se_corta): el diálogo de una nota no se cierra hasta que el servidor la
// guardó, y un clic fuera no cierra un diálogo con un audio grabado y sin enviar. La protección vive en el diálogo común
// (director.ts › pedir, con su `guardar`): estas pruebas leen el código y fallan si una nota vuelve a guardarse después de
// cerrar el diálogo, o si pedir cierra antes de que el guardado responda.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Con los finales de línea de Windows (CRLF, como lo saca git en un clon nuevo) se busca igual
const director = readFileSync(join(__dirname, 'director.ts'), 'utf-8').replace(/\r\n/g, '\n');
const tramo = (desde: string, hasta: string) => {
  const i = director.indexOf(desde);
  expect(i, `no encontré «${desde}»`).toBeGreaterThanOrEqual(0);
  const j = director.indexOf(hasta, i + desde.length);
  expect(j, `no encontré «${hasta}» después de «${desde}»`).toBeGreaterThan(i);
  return director.slice(i, j);
};
const veces = (texto: string, buscado: string) => texto.split(buscado).length - 1;

/** Guardar una nota: dejarla en el Buzón (dejarNota) o mandarla como comentario (accion con tipo «comentar»). */
const GUARDA_NOTA = /dejarNota\(|accion\(\{ tipo: 'comentar'/g;

/**
 * Un diálogo de nota guarda dentro de su `guardar`, nunca después: lo que guarda va entre «guardar:» y el cierre de la
 * llamada a pedir, y después de ese cierre no se guarda nada.
 */
function guardaDentro(t: string) {
  const guardar = t.indexOf('guardar:');
  expect(guardar, 'el diálogo de la nota no usa «guardar»').toBeGreaterThan(t.indexOf('pedir({'));
  const cierre = t.indexOf('});', guardar);
  expect(cierre).toBeGreaterThan(guardar);
  const dentro = [...t.slice(guardar, cierre).matchAll(GUARDA_NOTA)];
  expect(dentro, 'el guardado no está dentro de «guardar»').toHaveLength(1);
  expect(t.slice(cierre).match(GUARDA_NOTA), 'la nota se guarda después de cerrar el diálogo').toBeNull();
  return t.slice(cierre);
}

describe('nada se corta: la nota se guarda antes de cerrar su diálogo (pedido del titular pd_nada_se_corta)', () => {
  const pedir = tramo('function pedir(', '\n}\n');
  const envio = pedir.slice(pedir.indexOf("form.addEventListener('submit'"), pedir.indexOf('const alCerrar'));

  it('con «guardar», pedir cierra solo cuando el guardado respondió que sí', () => {
    expect(pedir).toContain('guardar?: (r: Dicho) => Promise<boolean>');
    // Sin «guardar», como siempre; con él, primero se marca que guarda, se espera el guardado y solo con un sí se cierra
    expect(envio).toMatch(/if \(!o\.guardar\) return terminar\(resultado\);\s*\/\/[^\n]*\n\s*marcarGuardando\(true\);\s*const guardado = await [^\n]*o\.guardar[^\n]*;\s*marcarGuardando\(false\);\s*if \(guardado\) return terminar\(resultado\);/);
    // Y no hay otro camino que lo cierre desde el envío
    expect(veces(envio, 'terminar(')).toBe(2);
    // Un envío a la vez: la nota no queda dos veces
    expect(envio).toMatch(/if \(enviando\) return;\s*enviando = true;/);
    // Cerrado con Cancelar o Esc mientras se preparaba el audio o lo adjunto, no se guarda nada
    const cerrado = envio.indexOf('if (listo) return;');
    expect(cerrado).toBeGreaterThan(envio.indexOf('await confirmarUrgencia()'));
    expect(cerrado).toBeLessThan(envio.indexOf('marcarGuardando(true)'));
  });

  it('si no se guardó, queda abierto con todo y dice que no se guardó y que se vuelva a intentar', () => {
    const fallo = envio.slice(envio.indexOf('if (guardado) return terminar(resultado);'));
    expect(fallo).toContain('No se guardó');
    expect(fallo).toContain('SIGUE_AQUI');
    expect(director).toMatch(/const SIGUE_AQUI = '[^']*sigue aquí: vuelve a intentarlo\.'/);
    // El mensaje va dentro del diálogo, donde también lo escribe el aviso (avisar)
    expect(pedir).toContain('<p class="error-explorador" role="alert"></p>');
    // La grabadora y lo adjunto solo terminan al cerrar (tras guardar o al cancelar): nunca antes de saber si se guardó
    const terminar = pedir.slice(pedir.indexOf('const terminar = '), pedir.indexOf('const marcarGuardando'));
    for (const t of ['grabadora?.terminar()', 'adjuntos?.terminar()']) {
      expect(veces(pedir, t), t).toBe(1);
      expect(terminar).toContain(t);
    }
  });

  it('mientras guarda, ni Cancelar, ni Esc, ni un clic fuera lo cierran, y su botón dice que guarda', () => {
    const marcar = pedir.slice(pedir.indexOf('const marcarGuardando'), pedir.indexOf("dlg.querySelector('[data-cancelar]')"));
    expect(marcar).toContain("'Guardando…'");
    expect(marcar).toContain('.disabled = si');
    expect(pedir).toContain("addEventListener('click', () => { if (!guardando) terminar(null); })");
    // Esc y el clic fuera (modal.ts › cerrarConClicFuera) piden su «cancel»: mientras guarda, se le impide
    expect(pedir).toMatch(/const alCancelar = \(e: Event\) => \{\s*if \(guardando\) e\.preventDefault\(\);\s*else terminar\(null\);/);
    // Si el navegador lo cierra igual (dos Esc seguidos), se vuelve a abrir
    expect(pedir).toMatch(/const alCerrar = \(\) => \{\s*if \(dlg\.open\) return;\s*if \(guardando\) dlg\.showModal\(\);\s*else terminar\(null\);/);
    expect(pedir).not.toContain('{ once: true }');
  });

  it('un clic fuera no cierra el ✉ con un audio grabado y sin enviar', () => {
    const clic = tramo("$('dialogo').addEventListener('click'", 'function pedir(');
    expect(clic).toContain('antesDeCerrarConClicFuera(g.estado)');
    expect(clic.indexOf('e.stopPropagation()')).toBeGreaterThan(clic.indexOf('if (!aviso) return;'));
  });

  it('comentar deja la nota dentro de «guardar» y solo vuelve con true si quedó en el Buzón', () => {
    const despues = guardaDentro(tramo('async function comentar(', 'type Dicho ='));
    expect(despues).toMatch(/return !!r;/);
    // dejarNota hace sus efectos (el sonido, lo urgente) una vez y solo si se guardó
    const dejar = tramo('async function dejarNota(', '\n}\n');
    expect(veces(dejar, 'await accion(')).toBe(1);
    const efectos = dejar.split('\n').filter((l) => /sonar\(|pedirLaRevision\(/.test(l) && !l.trim().startsWith('//'));
    expect(efectos).toHaveLength(2);
    for (const l of efectos) expect(l, l).toMatch(/^\s*if \(ok && /);
    expect(dejar).toMatch(/if \(ok && urgente\) \{\s*pintarSegundoPlano\(\);\s*vigilarTranscripciones/);
  });

  it('el comentario del director flotante, seguir una conversación y contar una elección también guardan con el diálogo abierto', () => {
    // El comentario general es el mismo diálogo único (pd_dialogo_unico): pasa por comentar, que guarda dentro
    expect(tramo('async function escribirAlDirector(', '\n}\n')).toMatch(/await comentar\(\{ tipo: 'general' \}/);
    guardaDentro(tramo('} else if (ds.seguirHilo) {', '} else if (ds.fase) {'));
    // Una opción o varias juntas (un paso con `varias`): las dos pasan por elegirEnPaso
    guardaDentro(tramo('async function elegirEnPaso(', '\n}\n').split('b.setAttribute(')[0]);
    const elegir = tramo('} else if (ds.elegir) {', '} else if (ds.yaLoDije) {');
    expect(elegir.match(/await elegirEnPaso\(b, /g)).toHaveLength(2);
  });
});
