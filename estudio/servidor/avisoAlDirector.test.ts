// El aviso al director que trabaja: «Detener ahora» y el aviso antes de su límite (pr_procesos_vista, puntos 3 y 4), por
// la entrada en stream-json, el camino que midió la prueba real del 28 de octubre de 2026.
import { mkdtempSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { avanzaba, avisoDetener, avisoLimite, avisoProrroga, cerrarLaEntrada, DETENER_TRAS_MIN, leerTurno, mensajeDeEntrada, minutosDelAviso, SOBRE_EL_AVISO } from './avisoAlDirector';
import { diagnosticarFalla, encargo, encargoAclaracion, encargoUrgencia, finEscrito, leerDesde, MAX_MIN_ACLARAR, MAX_MIN_URGENCIA } from './revisor';
import { NOMBRE_FIN } from '../../src/director/finDeLanzamiento';

const linea = (e: Record<string, unknown>) => JSON.stringify(e);
const asistente = linea({ type: 'assistant', message: { content: [{ type: 'text', text: 'trabajo' }] } });
const resultado = linea({ type: 'result', result: 'listo' });
const fondo = (n: number) => linea({ type: 'system', subtype: 'background_tasks_changed', tasks: Array.from({ length: n }, (_, i) => ({ task_id: `t${i}`, description: 'un ayudante' })) });

describe('el aviso al director que trabaja', () => {
  it('avisa diez minutos antes, o un tercio del límite si es corto, y nunca menos de uno', () => {
    expect(minutosDelAviso(60)).toBe(10);
    expect(minutosDelAviso(180)).toBe(10);
    expect(minutosDelAviso(30)).toBe(10);
    expect(minutosDelAviso(15)).toBe(5);
    expect(minutosDelAviso(2)).toBe(1);
  });

  it('el aviso es un mensaje más por la entrada en stream-json, como el que midió la prueba real', () => {
    const m = mensajeDeEntrada('hola');
    expect(m.endsWith('\n')).toBe(true);
    expect(JSON.parse(m)).toEqual({ type: 'user', message: { role: 'user', content: [{ type: 'text', text: 'hola' }] } });
  });

  it('cada aviso le dice que no empiece nada, guarde lo que pasa sus pruebas y cierre, sin esperar lo de segundo plano', () => {
    for (const a of [avisoDetener('Laura'), avisoLimite(10), avisoProrroga(10)]) {
      expect(a).toMatch(/^Notice from the Studio: /);
      expect(a).toContain('Start nothing new');
      expect(a).toContain('--listo');
      expect(a).toContain('Wait for nothing you launched in the background');
    }
    expect(avisoDetener('Laura')).toContain('Laura pressed «Detener ahora»');
    expect(avisoDetener('Laura')).toContain(`${DETENER_TRAS_MIN} minutes`);
    expect(avisoLimite(10)).toContain('in 10 minutes');
    expect(avisoProrroga(5)).toContain('5 more minutes, once');
  });

  it('el encargo de la revisión, la urgencia y la aclaración le dice que haga caso al aviso', () => {
    expect(encargo('golf')).toContain(SOBRE_EL_AVISO);
    expect(encargoUrgencia({ proyecto: 'golf', quien: 'Laura', notas: ['n1'], pedida: '2026-10-28T10:00:00.000Z' })).toContain(SOBRE_EL_AVISO);
    expect(encargoAclaracion({ proyecto: 'golf', mision: 'm1', paso: 0, nota: 'n1', quien: 'Laura', pedida: '2026-10-28T10:00:00.000Z' })).toContain(SOBRE_EL_AVISO);
  });

  it('la entrada se cierra cuando termina su turno sin nada en segundo plano, y sigue abierta mientras algo lo despierte', () => {
    // Trabajando, no
    let t = leerTurno([asistente].join('\n'));
    expect(cerrarLaEntrada(t)).toBe(false);
    // Terminó su turno esperando a un ayudante: la entrada sigue abierta
    t = leerTurno([fondo(1), resultado].join('\n'), t);
    expect(t).toEqual({ termino: true, fondo: 1 });
    expect(cerrarLaEntrada(t)).toBe(false);
    // El ayudante terminó y lo despertó: trabaja otra vez
    t = leerTurno([fondo(0), asistente].join('\n'), t);
    expect(cerrarLaEntrada(t)).toBe(false);
    // Y termina su turno sin nada pendiente: se cierra
    t = leerTurno(resultado, t);
    expect(cerrarLaEntrada(t)).toBe(true);
    // Lo que no es JSON, o las líneas del Studio, no cambian nada
    expect(leerTurno('Background tasks still running\n{"type":"studio","aviso":"limite"}\n{a medio', t)).toEqual(t);
  });

  it('avanzaba si su registro creció hace poco o tiene algo corriendo', () => {
    const ahora = Date.parse('2026-10-28T12:00:00.000Z');
    expect(avanzaba(ahora - 60_000, null, ahora, 10)).toBe(true);
    expect(avanzaba(ahora - 11 * 60_000, null, ahora, 10)).toBe(false);
    expect(avanzaba(ahora - 30 * 60_000, 'Corre las pruebas', ahora, 10)).toBe(true);
    expect(avanzaba(null, null, ahora, 10)).toBe(false);
  });

  it('lee lo nuevo del registro por líneas enteras, sin leerlo todo cada vez', () => {
    const archivo = join(mkdtempSync(join(tmpdir(), 'stl-aviso-')), 'r.log');
    writeFileSync(archivo, `${asistente}\n{"type":"res`);
    const a = leerDesde(archivo, 0);
    expect(a.texto).toBe(`${asistente}\n`);
    appendFileSync(archivo, 'ult"}\n');
    const b = leerDesde(archivo, a.hasta);
    expect(b.texto).toBe('{"type":"result"}\n');
    expect(leerDesde(archivo, b.hasta)).toEqual({ texto: '', hasta: b.hasta });
    expect(leerDesde(join(archivo, 'no-existe'), 7)).toEqual({ texto: '', hasta: 7 });
  });

  it('si no cerró a tiempo después de «Detener ahora», el final y el reporte lo dicen; si cerró, que cerró al pedírselo', () => {
    const registro = [linea({ type: 'system', subtype: 'init' }), asistente].join('\n');
    const f = { inicio: 0, fin: 10 * 60_000, codigo: null, problema: 'x' };
    const cortada = finEscrito(registro, { ...f, cerro: false, detenida: 'Laura' });
    expect(cortada.quien).toBe('detenida');
    expect(cortada.causa).toContain('Laura oprimió «Detener ahora»');
    expect(NOMBRE_FIN.detenida).toBeTruthy();
    expect(diagnosticarFalla(registro, { ...f, detenida: 'Laura' })).toMatchObject({ que: 'La detuviste', accion: 'pedir' });
    expect(finEscrito(registro, { ...f, cerro: true, pidioCierre: 'Laura' })).toMatchObject({ quien: 'cierre', causa: 'Cerró con lo hecho cuando Laura se lo pidió con «Detener ahora».' });
    expect(finEscrito(registro, { ...f, cerro: true }).causa).toBe('Cerró con su cierre y terminó solo.');
  });

  it('una aclaración o una urgencia que no se cerró trae su reporte, y la pedida otra vez con «Retomarla» lo dice en su encargo (pr_retoma_automatica, punto 5)', () => {
    const reintento = { lanzada: '2026-10-28T09:00:00.000Z' };
    expect(encargoUrgencia({ proyecto: 'golf', quien: 'Laura', notas: ['n1'], pedida: '2026-10-28T10:00:00.000Z', reintento })).toContain('Es un reintento');
    expect(encargoAclaracion({ proyecto: 'golf', mision: 'm1', paso: 0, nota: 'n1', quien: 'Laura', pedida: '2026-10-28T10:00:00.000Z', reintento })).toContain('Es un reintento');
    expect(encargoUrgencia({ proyecto: 'golf', quien: 'Laura', notas: ['n1'], pedida: '2026-10-28T10:00:00.000Z' })).not.toContain('Es un reintento');
    const revisor = readFileSync(new URL('./revisor.ts', import.meta.url), 'utf8');
    const fin = revisor.slice(revisor.indexOf('const fin = async'), revisor.lastIndexOf("p.on('error'"));
    expect(fin).toContain("problema.replace('La revisión', 'La aclaración'), reporteAparte())");
    expect(fin).toContain("problema.replace('La revisión', 'La urgencia'), reporteAparte())");
    // La bandeja de la aclaración y la de lo urgente listan lo que dejó la que no se cerró
    const bandeja = readFileSync(new URL('../../tools/director/bandeja.ts', import.meta.url), 'utf8');
    expect(bandeja).toContain('lineasDeRetoma(elegido, plan, a.reintento.lanzada');
    expect(bandeja).toContain('lineasDeRetoma(elegido, plan, u.reintento.lanzada');
  });

  it('la página dice los mismos minutos que el servidor: los de cerrar tras «Detener ahora», los de lo urgente y los de una aclaración', () => {
    const pagina = readFileSync(new URL('../src/director.ts', import.meta.url), 'utf8');
    expect(pagina).toContain(`const DETENER_TRAS_MIN = ${DETENER_TRAS_MIN};`);
    expect(pagina).toContain(`const MIN_URGENCIA = ${MAX_MIN_URGENCIA};`);
    expect(pagina).toContain(`const MIN_ACLARAR = ${MAX_MIN_ACLARAR};`);
    // «Detener ahora» también en lo urgente y en el paso que se aclara, con lo que lleva de su límite
    expect(pagina).toContain('seguimientoAparte(u.lanzada, MIN_URGENCIA)');
    expect(pagina).toContain('MIN_ACLARAR)}<span class="puntos"');
  });

  it('el lanzador manda el encargo por la entrada en stream-json, deja la entrada abierta para el aviso y la cierra al terminar el turno', () => {
    const revisor = readFileSync(new URL('./revisor.ts', import.meta.url), 'utf8');
    const lanzar = revisor.slice(revisor.indexOf('private async lanzar('), revisor.indexOf('function anotarHijo('));
    expect(lanzar).toContain("['-p', '--input-format', 'stream-json', '--output-format', 'stream-json'");
    const guarda = lanzar.indexOf('writeFileSync(paqueteDeRegistro(archivo).encargo, elEncargo');
    const manda = lanzar.indexOf('p.stdin?.write(mensajeDeEntrada(elEncargo))');
    expect(guarda).toBeGreaterThan(0);
    expect(manda).toBeGreaterThan(guarda);
    expect(lanzar).not.toContain('p.stdin?.end(elEncargo)');
    // La entrada se cierra solo cuando terminó su turno sin nada en segundo plano, y al terminar, de la forma que sea
    expect(lanzar).toContain('if (cerrarLaEntrada(suTurno))');
    expect(lanzar.slice(lanzar.indexOf('const fin = async'))).toContain('clearInterval(vigiaTurno)');
    // Los minutos de más, una sola vez y solo si avanzaba; «Detener ahora», con su corte a los DETENER_TRAS_MIN minutos
    expect(lanzar).toContain('if (!prorrogada && !detenidaPor && avanzaba(');
    expect(lanzar).toContain('DETENER_TRAS_MIN * 60_000');
  });
});
