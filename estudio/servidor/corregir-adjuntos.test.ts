// «Corregir» una nota con todo lo que tenía al escribirla: también sus imágenes (notas de voz del titular nmvosyiartit y
// nmvot02hhtit, 26 de octubre de 2026; pedido pd_corregir_adjuntos). Lee el código, como las demás pruebas de la página.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const leer = (ruta: string) => readFileSync(join(process.cwd(), ruta), 'utf8');

describe('corregir una nota con sus imágenes', () => {
  const pagina = leer('estudio/src/director.ts');
  const corregir = pagina.slice(pagina.indexOf('} else if (ds.editarNota) {'), pagina.indexOf('} else if (ds.decidir) {'));

  it('el diálogo de «Corregir» deja pegar o adjuntar imágenes, y quitar las que tiene con su casilla', () => {
    expect(corregir).toContain('adjuntos: true,');
    expect(corregir).toContain('actuales: n.adjuntos ?? [],');
    expect(pagina).toContain('name="quitar-adjunto" value="${esc(a.ruta)}"');
    expect(pagina).toContain("new FormData(form).getAll('quitar-adjunto')");
    // Solo con imágenes nuevas o quitadas, sin cambiar el texto, también se guarda
    expect(corregir).toContain('if ((cambioTexto || conAdjuntos) && !(await accion({ tipo: \'editar_nota\'');
  });

  it('el servidor guarda las nuevas con el número que sigue, quita las marcadas y no deja la nota vacía ni con más de las que caben', () => {
    const servidor = leer('estudio/servidor/director.ts');
    const caso = servidor.slice(servidor.indexOf("case 'editar_nota': {"), servidor.indexOf("case 'corregir_transcripcion': {"));
    expect(caso).toContain('cuerpo.quitarAdjuntos');
    expect(caso).toContain('await guardarAdjunto(raiz, rutas.notas, `${n.id}-${++siguiente}`, x)');
    expect(caso).toContain('archivos.push(a.ruta)');
    expect(caso).toContain('quedan.length + nuevos.length > MAX_ADJUNTOS');
    expect(caso).toContain("throw new Rechazo('La nota quedaría vacía: mejor bórrala.')");
    // Sigue siendo solo para las propias y antes de que el director la responda
    expect(caso).toContain("throw new Rechazo('Solo puedes corregir tus propias notas.')");
    expect(caso).toContain("throw new Rechazo('El director ya respondió esa nota: queda en el historial.')");
  });
});
