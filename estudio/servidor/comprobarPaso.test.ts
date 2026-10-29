// «Ya lo hice: compruébalo tú» (propuesta aceptada pr_verificar_paso): un paso hecho fuera del Studio, que nada comprueba
// solo, lo comprueba el director al instante, aparte de la revisión, por el camino de la aclaración.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { comprobacionesDe, pasosPorComprobar, seMarcaAMano, tratamientosDeNota, type Nota } from '../../src/director/director';
import { lineaDeRegistro } from '../../src/director/lineasDeRevision';
import { encargoAclaracion, encargoComprobacion, MAX_MIN_ACLARAR } from './revisor';
import { SOBRE_EL_AVISO } from './avisoAlDirector';

const leer = (ruta: string) => readFileSync(new URL(ruta, import.meta.url), 'utf8');
const pedida = { proyecto: 'golf', mision: 't_subir', paso: 1, nota: 'n1', quien: 'Laura', pedida: '2026-10-28T10:00:00.000Z', comprobar: true };

describe('«Ya lo hice: compruébalo tú»', () => {
  it('solo en los pasos que se marcan a mano: no en los que el Studio ve, los que comprueba una orden, los que eligen o los que encarga', () => {
    expect(seMarcaAMano('Sube la página')).toBe(true);
    expect(seMarcaAMano({ texto: 'Configura tu cuenta', soloTu: 'es tu cuenta' })).toBe(true);
    expect(seMarcaAMano({ texto: 'Lee', hecho: { que: 'leido', id: 'docs/x.md' } })).toBe(false);
    expect(seMarcaAMano({ texto: 'Corre', terminal: 'git push', comprobar: { orden: 'git status', vacia: true } })).toBe(false);
    expect(seMarcaAMano({ texto: 'Elige', opciones: ['Sí', 'No'] })).toBe(false);
    expect(seMarcaAMano({ texto: 'Que lo haga', hazlo: 'lo configuro' })).toBe(false);
    expect(pasosPorComprobar({ pasos: ['a', { texto: 'b', opciones: ['x', 'y'] }, 'c'] }, [0, 1, 2])).toEqual([0, 2]);
  });

  it('su nota es del paso, se informa o se integra, y no es un comentario ni una aclaración', () => {
    const nota = { id: 'n1', cuando: '2026-10-28T10:00:00.000Z', quien: 'Laura', sobre: { tipo: 'mision', id: 't_subir', seccion: 'Paso 2', comprobar: true }, texto: 'Ya lo hice: compruébalo tú.' } as Nota;
    expect(comprobacionesDe([nota], 't_subir', 1)).toEqual([nota]);
    expect(comprobacionesDe([nota], 't_subir', 0)).toEqual([]);
    expect(tratamientosDeNota(nota)).toEqual(['integrada', 'informada']);
  });

  it('el encargo es corto y aparte: solo ese paso, con --comprobar y su cierre, sin tocar el código ni hacer el paso por la persona', () => {
    const e = encargoComprobacion(pedida);
    expect(e).toContain('node tools/director/bandeja.ts --proyecto golf --comprobar y sigue lo que dice');
    expect(e).toContain('node tools/director/bandeja.ts --proyecto golf --comprobar --listo');
    expect(e).toContain('NO hagas la revisión completa');
    expect(e).toContain('No toques el código ni hagas por la persona lo que el paso le pide');
    expect(e).toContain(SOBRE_EL_AVISO);
    expect(e).toContain(`${MAX_MIN_ACLARAR}`);
    expect(e).not.toBe(encargoAclaracion(pedida));
  });

  it('el lanzador elige su encargo por la marca, y lo dice así en la bitácora y si no pudo', () => {
    const revisor = leer('./revisor.ts');
    expect(revisor).toContain('(aparte.a.comprobar ? encargoComprobacion(aparte.a) : encargoAclaracion(aparte.a))');
    expect(revisor).toContain("lanza al director para ${aparte.a.comprobar ? 'comprobar' : 'aclarar'} el paso");
    expect(revisor).toContain("no pudo ${a.comprobar ? 'comprobar' : 'aclarar'} el paso");
  });

  it('el servidor deja la nota y lo pide como aclaración, sin pedir una revisión; la bandeja lo atiende con --comprobar', () => {
    const servidor = leer('./director.ts');
    const ruta = servidor.slice(servidor.indexOf("if (ruta === '/comprobar-paso'"), servidor.indexOf("if (ruta === '/terminal'"));
    expect(ruta).toContain("pedirAclaracion(raiz, { proyecto: id, mision: m.id, paso, nota: nota.id, quien: yo.nombre, comprobar: true })");
    expect(ruta).toContain('if (!seMarcaAMano(m.pasos[paso]))');
    expect(ruta).not.toMatch(/pedirRevision|pedirYLanzar/);
    const bandeja = leer('../../tools/director/bandeja.ts');
    expect(bandeja).toContain("if (args.includes('--aclarar') || args.includes('--comprobar')) {");
    expect(bandeja).toContain("a.comprobar ? 'Comprobación hecha' : 'Aclaración hecha'");
    expect(leer('../src/director.ts')).toContain('Ya lo hice: compruébalo tú</button>');
  });

  it('una comprobación que cerró cuenta como cerrada en la línea de su revisión', () => {
    const texto = [
      JSON.stringify({ type: 'system', subtype: 'init', model: 'claude-opus-5-5' }),
      JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', content: 'Comprobación hecha: n1' }] } }),
      JSON.stringify({ type: 'result', total_cost_usd: 0.4, duration_ms: 120000 }),
    ].join('\n');
    expect(lineaDeRegistro('golf-aclaracion-2026-10-28T10-00-00-000Z.log', texto)?.cerro).toBe(true);
  });
});
