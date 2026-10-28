import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { negadosEnVivo } from '../../src/director/director';
import { avisosDelSonido, ESPERA_PERMISO_MS, EsperaDePermisos, lineasDeNegadosSinDecidir, MAX_AVISOS, ordenesQueFaltan, porQueNoSiempre, queAnotarDeLaLlamada, queAnotarDeLaRespuesta, REPETIR_SONIDO_MS, RESPUESTAS, respuestaDelGancho, respuestaValida, solicitudDelGancho, type SolicitudDePermiso } from './permisoAlMomento';
import { NEGACION, negadosDe, NUNCA_SIEMPRE, permisosNegados } from './permisosNegados';
import { negado, SIN_ESPERAS } from './revisor';

// «Me pregunta en el Studio» (pr_permisos_al_momento, pieza 2; decisión del titular del 26 de octubre de 2026): la espera de
// dos minutos, las tres respuestas, lo que nunca, la persona ausente y el sonido del diálogo
const CASA = String.raw`C:\Users\ana`;
const STUDIO = String.raw`C:\xampp\STL`;
const GOLF = String.raw`C:\repos\golf`;
const prohibidas = [...new Set([...SIN_ESPERAS, ...negado(GOLF, STUDIO), ...NUNCA_SIEMPRE])];

const SEG = 1000;
const T0 = 1_000_000;
const curl: SolicitudDePermiso = { herramienta: 'Bash', entrada: { command: 'curl -s http://localhost:5180/__estudio/voz/lista' } };
const gitLog: SolicitudDePermiso = { herramienta: 'Bash', entrada: { command: 'git log --oneline -5' } };
const lee: SolicitudDePermiso = { herramienta: 'Read', entrada: { file_path: String.raw`D:\notas\idea.md` } };
const push: SolicitudDePermiso = { herramienta: 'Bash', entrada: { command: 'git push --force origin main' } };
const ssh: SolicitudDePermiso = { herramienta: 'Read', entrada: { file_path: String.raw`C:\Users\ana\.ssh\id_rsa` } };
const cadena: SolicitudDePermiso = { herramienta: 'Bash', entrada: { command: 'cd x && curl -s http://y' } };
const nueva = () => new EsperaDePermisos('golf', prohibidas, CASA);

describe('los permisos que le faltan al director en plena revisión, con «Me pregunta en el Studio»', () => {
  it('las constantes son las que decidió el titular: dos minutos, el sonido cada 30 segundos, hasta 4 veces', () => {
    expect(ESPERA_PERMISO_MS).toBe(120_000);
    expect(REPETIR_SONIDO_MS).toBe(30_000);
    expect(MAX_AVISOS).toBe(4);
  });

  it('una llamada que no es de lo que nunca queda esperando, con la regla general de su tipo de acción', () => {
    const e = nueva();
    const p = e.pedir(curl, T0);
    expect(p.decision).toBeNull();
    expect(p.venceEn).toBe(T0 + ESPERA_PERMISO_MS);
    expect(p.propuesta.regla).toBe('Bash(curl:*)');
    expect(p.puedeSiempre).toBe(true);
    expect(e.pendientes().map((x) => x.id)).toEqual([p.id]);
    expect(e.decisionDe(p.id)).toBeNull();
    expect(e.ausente).toBe(false);
  });

  it('«Solo esta vez» da el permiso de esa llamada y no guarda ninguna regla', () => {
    const e = nueva();
    const p = e.pedir(curl, T0);
    const r = e.responder(p.id, 'una_vez', T0 + 5 * SEG);
    expect(r).toEqual({ aplicada: true, decision: { permitir: true, guardar: null } });
    expect(e.decisionDe(p.id)).toEqual({ permitir: true, guardar: null });
    expect(e.pendientes()).toEqual([]);
  });

  it('«Permitir siempre» da el permiso y devuelve la regla general del tipo de acción, solo para el proyecto que se revisa', () => {
    const e = nueva();
    const a = e.responder(e.pedir(curl, T0).id, 'siempre', T0 + SEG);
    expect(a?.decision).toEqual({ permitir: true, guardar: { regla: 'Bash(curl:*)', proyecto: 'golf', alcance: 'proyecto' } });
    // La misma regla que ofrece el panel de permisos: la carpeta que leyó, no el archivo
    const b = e.responder(e.pedir(lee, T0 + 2 * SEG).id, 'siempre', T0 + 3 * SEG);
    expect(b?.decision).toEqual({ permitir: true, guardar: { regla: 'Read(//d/notas/**)', proyecto: 'golf', alcance: 'proyecto' } });
  });

  it('«Permitir siempre» no se ofrece donde no hay regla que dar, y si llega vale como «Solo esta vez»', () => {
    const e = nueva();
    const p = e.pedir(cadena, T0);
    expect(p.propuesta.regla).toBeNull();
    expect(p.puedeSiempre).toBe(false);
    expect(e.responder(p.id, 'siempre', T0 + SEG)?.decision).toEqual({ permitir: true, guardar: null });
  });

  it('«No lo autorizo» niega esa llamada, y la persona que negó no deja ausente a la revisión', () => {
    const e = nueva();
    const p = e.pedir(curl, T0);
    expect(e.responder(p.id, 'no', T0 + SEG)).toEqual({ aplicada: true, decision: { permitir: false, motivo: 'no_autorizado' } });
    expect(e.ausente).toBe(false);
    expect(e.pedir(gitLog, T0 + 10 * SEG).decision).toBeNull();
    // Lo que la persona negó ya lo decidió ella: no queda esperando en el panel
    expect(e.quedanParaElPanel()).toEqual([]);
  });

  it('lo que cae en lo que nunca se niega al instante, sin preguntar, y no se ofrece «Permitir siempre»', () => {
    const e = nueva();
    const subir = e.pedir(push, T0);
    expect(subir.decision).toMatchObject({ permitir: false, motivo: 'nunca', nunca: { porque: expect.stringMatching(/historia ya subida/) } });
    expect(subir.puedeSiempre).toBe(false);
    expect(e.pedir(ssh, T0).decision).toMatchObject({ permitir: false, motivo: 'nunca' });
    expect(e.pedir({ herramienta: 'ScheduleWakeup', entrada: {} }, T0).decision).toMatchObject({ permitir: false, motivo: 'nunca' });
    expect(e.pendientes()).toEqual([]);
    expect(e.decisionDe(subir.id)).toMatchObject({ motivo: 'nunca' });
    // Tampoco por responder: ya se negó
    expect(e.responder(subir.id, 'una_vez', T0 + SEG)).toMatchObject({ aplicada: false, decision: { permitir: false, motivo: 'nunca' } });
    // Ni se cuenta para el panel: no hay nada que autorizar
    expect(e.quedanParaElPanel()).toEqual([]);
  });

  it('a los dos minutos sin respuesta se niega, y el permiso queda pendiente para el panel', () => {
    const e = nueva();
    const p = e.pedir(curl, T0);
    expect(e.vencer(T0 + ESPERA_PERMISO_MS - 1)).toEqual([]);
    expect(e.pendientes()).toHaveLength(1);
    const vencidos = e.vencer(T0 + ESPERA_PERMISO_MS);
    expect(vencidos.map((x) => x.id)).toEqual([p.id]);
    expect(e.decisionDe(p.id)).toEqual({ permitir: false, motivo: 'sin_respuesta' });
    expect(e.pendientes()).toEqual([]);
    expect(e.quedanParaElPanel().map((x) => x.propuesta.regla)).toEqual(['Bash(curl:*)']);
  });

  it('una respuesta que llega después de los dos minutos no cuenta', () => {
    const e = nueva();
    const p = e.pedir(curl, T0);
    const tarde = e.responder(p.id, 'siempre', T0 + ESPERA_PERMISO_MS + SEG);
    expect(tarde).toEqual({ aplicada: false, decision: { permitir: false, motivo: 'sin_respuesta' } });
    expect(e.responder('no-existe', 'no', T0)).toBeNull();
  });

  it('si la primera pregunta de la revisión no se responde, la persona no está: lo que sigue se niega al instante, aunque no sea de lo que nunca', () => {
    const e = nueva();
    const primera = e.pedir(curl, T0);
    expect(e.vencer(T0 + ESPERA_PERMISO_MS).map((x) => x.id)).toEqual([primera.id]);
    expect(e.ausente).toBe(true);
    const segunda = e.pedir(gitLog, T0 + ESPERA_PERMISO_MS + SEG);
    expect(segunda.decision).toEqual({ permitir: false, motivo: 'ausente' });
    expect(e.pendientes()).toEqual([]);
    // Las dos quedan pendientes en el panel, para autorizarlas con calma
    expect(e.quedanParaElPanel().map((x) => x.propuesta.regla)).toEqual(['Bash(curl:*)', 'Bash(git log:*)']);
  });

  it('lo que esperaba cuando la primera venció se niega con ella, sin esperar sus propios dos minutos', () => {
    const e = nueva();
    const primera = e.pedir(curl, T0);
    const segunda = e.pedir(lee, T0 + 60 * SEG);
    expect(e.pendientes()).toHaveLength(2);
    expect(e.vencer(T0 + ESPERA_PERMISO_MS).map((x) => [x.id, x.decision])).toEqual([
      [primera.id, { permitir: false, motivo: 'sin_respuesta' }],
      [segunda.id, { permitir: false, motivo: 'ausente' }],
    ]);
    expect(e.pendientes()).toEqual([]);
  });

  it('si la persona respondió una, se siguen haciendo las preguntas aunque otra se quede sin respuesta', () => {
    const e = nueva();
    const a = e.pedir(curl, T0);
    e.responder(a.id, 'una_vez', T0 + 10 * SEG);
    const b = e.pedir(lee, T0 + 20 * SEG);
    e.vencer(T0 + 20 * SEG + ESPERA_PERMISO_MS);
    expect(e.decisionDe(b.id)).toEqual({ permitir: false, motivo: 'sin_respuesta' });
    expect(e.ausente).toBe(false);
    expect(e.pedir(gitLog, T0 + 200 * SEG).decision).toBeNull();
  });

  it('si la persona responde otra antes de que venza la primera, tampoco se da por ausente', () => {
    const e = nueva();
    const primera = e.pedir(curl, T0);
    const segunda = e.pedir(lee, T0 + 30 * SEG);
    e.responder(segunda.id, 'no', T0 + 40 * SEG);
    e.vencer(T0 + ESPERA_PERMISO_MS);
    expect(e.decisionDe(primera.id)).toEqual({ permitir: false, motivo: 'sin_respuesta' });
    expect(e.ausente).toBe(false);
  });

  it('lo que nunca no cuenta como «la primera sin responder»: se niega sin preguntar y la primera pregunta de verdad es la siguiente', () => {
    const e = nueva();
    e.pedir(push, T0);
    e.pedir(ssh, T0 + SEG);
    e.vencer(T0 + ESPERA_PERMISO_MS + 10 * SEG);
    expect(e.ausente).toBe(false);
    // La primera que se pregunta de verdad es esta; la persona la responde y se sigue preguntando
    const primera = e.pedir(curl, T0 + 130 * SEG);
    expect(primera.decision).toBeNull();
    e.responder(primera.id, 'una_vez', T0 + 140 * SEG);
    expect(e.pedir(gitLog, T0 + 150 * SEG).decision).toBeNull();
    // Y si esa primera no se responde, ahí sí está ausente
    const otra = nueva();
    otra.pedir(push, T0);
    otra.pedir(curl, T0 + SEG);
    otra.vencer(T0 + SEG + ESPERA_PERMISO_MS);
    expect(otra.ausente).toBe(true);
    expect(otra.pedir(push, T0 + 200 * SEG).decision).toMatchObject({ motivo: 'nunca' });
    expect(otra.pedir(gitLog, T0 + 200 * SEG).decision).toMatchObject({ motivo: 'ausente' });
  });

  it('pedir al vencer los dos minutos aplica primero lo vencido: la pregunta que llega justo después ya encuentra a la persona ausente', () => {
    const e = nueva();
    e.pedir(curl, T0);
    expect(e.pedir(gitLog, T0 + ESPERA_PERMISO_MS).decision).toEqual({ permitir: false, motivo: 'ausente' });
  });

  it('la revisión de cada proyecto lleva su propia espera: lo del otro no cuenta', () => {
    const golf = nueva();
    const otro = new EsperaDePermisos('tesis', prohibidas, CASA);
    golf.pedir(curl, T0);
    golf.vencer(T0 + ESPERA_PERMISO_MS);
    expect(golf.ausente).toBe(true);
    expect(otro.ausente).toBe(false);
    expect(otro.responder(otro.pedir(curl, T0).id, 'siempre', T0 + SEG)?.decision).toMatchObject({ guardar: { proyecto: 'tesis', alcance: 'proyecto' } });
  });
});

// «Permitir todo en esta revisión» (nota de voz del titular nmvpr0b6vtit, 26 de octubre de 2026): aprobar en general, no
// llamada por llamada, hasta que termine esa revisión, salvo lo que nunca se permite
describe('«Permitir todo en esta revisión»', () => {
  const leeOtro: SolicitudDePermiso = { herramienta: 'Read', entrada: { file_path: String.raw`E:\datos\otra.md` } };
  const edita: SolicitudDePermiso = { herramienta: 'Edit', entrada: { file_path: String.raw`C:\repos\golf\src\a.ts` } };

  it('da esa llamada y no guarda ninguna regla permanente', () => {
    const e = nueva();
    expect(e.todoPermitido).toBe(false);
    const p = e.pedir(curl, T0);
    const r = e.responder(p.id, 'todo', T0 + 5 * SEG);
    expect(r).toEqual({ aplicada: true, decision: { permitir: true, guardar: null, todo: 'elegido' } });
    expect(e.todoPermitido).toBe(true);
    // Ninguna regla para guardar: a diferencia de «Permitir siempre», no queda nada en estudio.local.json
    expect(r?.decision).toMatchObject({ guardar: null });
    expect(e.pendientes()).toEqual([]);
    // La persona respondió: no se da por ausente aunque lo demás venza
    expect(e.ausente).toBe(false);
  });

  it('las llamadas siguientes de la misma revisión pasan solas, sin esperar ni preguntar', () => {
    const e = nueva();
    e.responder(e.pedir(curl, T0).id, 'todo', T0 + SEG);
    // Cualquier tipo de acción, también las que no tienen una regla general que ofrecer (una orden con varias juntas)
    for (const s of [gitLog, lee, leeOtro, edita, cadena, { herramienta: 'WebSearch', entrada: { query: 'vitest' } }]) {
      const p = e.pedir(s, T0 + 10 * SEG);
      expect(p.decision, s.herramienta).toEqual({ permitir: true, guardar: null, todo: 'automatico' });
    }
    expect(e.pendientes()).toEqual([]);
    // Y siguen pasando después de los dos minutos: no es una pregunta que venza
    expect(e.pedir(gitLog, T0 + 10 * ESPERA_PERMISO_MS).decision).toEqual({ permitir: true, guardar: null, todo: 'automatico' });
    expect(e.quedanParaElPanel()).toEqual([]);
  });

  it('lo que ya esperaba en el diálogo, de esa revisión, pasa con ella', () => {
    const e = nueva();
    const a = e.pedir(curl, T0);
    const b = e.pedir(lee, T0 + SEG);
    const c = e.pedir(gitLog, T0 + 2 * SEG);
    e.responder(b.id, 'todo', T0 + 3 * SEG);
    expect(e.decisionDe(a.id)).toEqual({ permitir: true, guardar: null, todo: 'automatico' });
    expect(e.decisionDe(b.id)).toEqual({ permitir: true, guardar: null, todo: 'elegido' });
    expect(e.decisionDe(c.id)).toEqual({ permitir: true, guardar: null, todo: 'automatico' });
    expect(e.pendientes()).toEqual([]);
    // Y la primera, aunque no la respondiera, no deja a la persona ausente: respondió otra
    expect(e.vencer(T0 + ESPERA_PERMISO_MS + SEG)).toEqual([]);
    expect(e.ausente).toBe(false);
  });

  it('lo que nunca se permite se sigue negando al instante, sin preguntar, aunque esté encendido', () => {
    const e = nueva();
    e.responder(e.pedir(curl, T0).id, 'todo', T0 + SEG);
    const subir = e.pedir(push, T0 + 2 * SEG);
    expect(subir.decision).toMatchObject({ permitir: false, motivo: 'nunca', nunca: { porque: expect.stringMatching(/historia ya subida/) } });
    expect(e.pedir(ssh, T0 + 3 * SEG).decision).toMatchObject({ permitir: false, motivo: 'nunca' });
    expect(e.pedir({ herramienta: 'ScheduleWakeup', entrada: {} }, T0 + 4 * SEG).decision).toMatchObject({ permitir: false, motivo: 'nunca' });
    // También si va en una cadena con otra orden permitida
    expect(e.pedir({ herramienta: 'Bash', entrada: { command: 'cd x && git push --force origin main' } }, T0 + 5 * SEG).decision).toMatchObject({ permitir: false, motivo: 'nunca' });
    // Responder «todo» sobre lo que nunca tampoco lo abre: ya estaba negado
    expect(e.responder(subir.id, 'todo', T0 + 6 * SEG)).toMatchObject({ aplicada: false, decision: { permitir: false, motivo: 'nunca' } });
    // Y lo que nunca no se cuenta para el panel: no hay nada que autorizar
    expect(e.quedanParaElPanel()).toEqual([]);
  });

  it('lo que nunca y se negó antes de encenderlo sigue negado cuando se enciende', () => {
    const e = nueva();
    const a = e.pedir(curl, T0);
    const subir = e.pedir(push, T0 + SEG);
    e.responder(a.id, 'todo', T0 + 2 * SEG);
    expect(e.decisionDe(subir.id)).toMatchObject({ permitir: false, motivo: 'nunca' });
    expect(e.pedir(push, T0 + 3 * SEG).decision).toMatchObject({ permitir: false, motivo: 'nunca' });
  });

  it('otra revisión (otro lanzamiento, otro proyecto) vuelve a preguntar: el botón es de una sola espera', () => {
    const una = nueva();
    const otra = nueva();
    const tesis = new EsperaDePermisos('tesis', prohibidas, CASA);
    una.responder(una.pedir(curl, T0).id, 'todo', T0 + SEG);
    expect(una.pedir(gitLog, T0 + 2 * SEG).decision).toMatchObject({ permitir: true });
    // El mismo proyecto en otro lanzamiento, y otro proyecto: esperan a la persona
    for (const e of [otra, tesis]) {
      expect(e.todoPermitido).toBe(false);
      const p = e.pedir(gitLog, T0 + 3 * SEG);
      expect(p.decision).toBeNull();
      expect(e.pendientes().map((x) => x.id)).toEqual([p.id]);
    }
  });

  it('desde que se elige no hace falta que la persona esté: no la da por ausente ni niega por falta de respuesta', () => {
    const e = nueva();
    e.responder(e.pedir(curl, T0).id, 'todo', T0 + SEG);
    const mucho = T0 + 30 * 60_000;
    expect(e.pedir(lee, mucho).decision).toEqual({ permitir: true, guardar: null, todo: 'automatico' });
    expect(e.ausente).toBe(false);
  });

  it('una respuesta que llega tarde no enciende nada', () => {
    const e = nueva();
    const p = e.pedir(curl, T0);
    expect(e.responder(p.id, 'todo', T0 + ESPERA_PERMISO_MS + SEG)).toEqual({ aplicada: false, decision: { permitir: false, motivo: 'sin_respuesta' } });
    expect(e.todoPermitido).toBe(false);
    expect(e.pedir(gitLog, T0 + ESPERA_PERMISO_MS + 2 * SEG).decision).toEqual({ permitir: false, motivo: 'ausente' });
  });

  it('el gancho imprime que sí, como con cualquier permiso dado', () => {
    expect(respuestaDelGancho({ permitir: true, guardar: null, todo: 'automatico' })).toEqual({ hookSpecificOutput: { hookEventName: 'PermissionRequest', decision: { behavior: 'allow' } } });
  });

  it('el servidor del diálogo acepta las cuatro respuestas y ninguna más', () => {
    expect([...RESPUESTAS].sort()).toEqual(['no', 'siempre', 'todo', 'una_vez']);
    for (const r of RESPUESTAS) expect(respuestaValida(r)).toBe(r);
    for (const mala of ['', 'TODO', 'todos', 'siempre ', null, undefined, 1, {}]) expect(respuestaValida(mala), String(mala)).toBeNull();
    // La ruta del servidor usa esta misma validación: lo que no es una de las cuatro, 400
    const servidor = readFileSync(new URL('./director.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
    const responde = servidor.slice(servidor.indexOf("ruta === '/permiso-al-momento' && req.method === 'POST'"));
    expect(responde.slice(0, 1200)).toContain('const respuesta = respuestaValida(cuerpo.respuesta);');
    expect(responde.slice(0, 2400)).toContain('queAnotarDeLaRespuesta(d, pregunta.propuesta.que)');
    // Y la de las llamadas del gancho anota si pasó por «Permitir todo en esta revisión»
    const pide = servidor.slice(servidor.indexOf("ruta === '/permiso-al-momento/pedir'"));
    expect(pide.slice(0, 1400)).toContain('decidirParaElGancho(permisosEnEspera, clave, entrada)');
    expect(pide.slice(0, 1400)).toContain('queAnotarDeLaLlamada(herramienta, dado, contestado.decision)');
  });

  it('en la bitácora queda dicho que lo que pasó solo fue por «Permitir todo en esta revisión», y que no guarda ninguna regla', () => {
    const elegido = { permitir: true, guardar: null, todo: 'elegido' } as const;
    const solo = { permitir: true, guardar: null, todo: 'automatico' } as const;
    expect(queAnotarDeLaRespuesta(elegido, 'Correr las órdenes «curl …»')).toMatch(/con «Permitir todo en esta revisión», todo lo que pida hasta que termine esta revisión, salvo lo que el Studio nunca permite, y no guarda ninguna regla/);
    expect(queAnotarDeLaRespuesta({ permitir: true, guardar: null }, 'x')).toBe('le autoriza al director, solo esta vez, «x»');
    expect(queAnotarDeLaRespuesta({ permitir: true, guardar: { regla: 'Bash(curl:*)', proyecto: 'golf', alcance: 'proyecto' } }, 'x')).toBe('le autoriza siempre al director «Bash(curl:*)» en este proyecto');
    expect(queAnotarDeLaRespuesta({ permitir: false, motivo: 'no_autorizado' }, 'x')).toBe('no le autoriza al director «x»');
    // La llamada que pasó sola dice por qué pasó; una dada de la forma de siempre, no
    const sola = queAnotarDeLaLlamada('Bash', true, solo);
    expect(sola.que).toBe('pide un permiso en plena revisión (Bash) y se le da, por «Permitir todo en esta revisión»');
    expect(sola.desde).toMatch(/ya elegido en esta revisión/);
    expect(queAnotarDeLaLlamada('Bash', true, elegido).que).toMatch(/por «Permitir todo en esta revisión»/);
    expect(queAnotarDeLaLlamada('Bash', true, { permitir: true, guardar: null })).toEqual({ que: 'pide un permiso en plena revisión (Bash) y se le da', desde: 'el gancho de permisos de Claude Code' });
    // Lo que nunca sigue diciendo que se le negó, sin mencionar el botón
    expect(queAnotarDeLaLlamada('Bash', false, { permitir: false, motivo: 'nunca' })).toEqual({ que: 'pide un permiso en plena revisión (Bash) y se le niega', desde: 'el gancho de permisos de Claude Code' });
    expect(queAnotarDeLaLlamada('Bash', false, null).que).toMatch(/se le niega$/);
  });
});

describe('por qué «Permitir siempre» no se ofrece', () => {
  it('con la orden que junta varias, lo dice así: es la orden la que viene junta', () => {
    const p = nueva().pedir(cadena, T0);
    expect(p.puedeSiempre).toBe(false);
    expect(p.porQueNoSiempre).toMatch(/la orden junta 2 órdenes en una sola/);
    expect(p.porQueNoSiempre).toMatch(/no hay un solo tipo de acción/);
    // Sin símbolos de código en lo que lee una persona
    expect(p.porQueNoSiempre).not.toMatch(/&&|\|\|/);
  });

  it('cuando se ofrece, no hay nada que explicar', () => {
    const p = nueva().pedir(curl, T0);
    expect(p.puedeSiempre).toBe(true);
    expect(p.porQueNoSiempre).toBeNull();
  });

  it('sin regla por otra razón, dice la de la regla del panel; si la regla choca con lo que nunca, lo dice', () => {
    const sinRuta = nueva().pedir({ herramienta: 'Read', entrada: { file_path: 'relativa.md' } }, T0);
    expect(sinRuta.puedeSiempre).toBe(false);
    expect(sinRuta.porQueNoSiempre).toMatch(/^no dijo en qué carpeta/);
    const regla = { regla: 'Bash(git:*)', que: 'x', riesgo: '' };
    expect(porQueNoSiempre(curl, regla, false, null)).toMatch(/nunca permite/);
    expect(porQueNoSiempre(curl, regla, false, { porque: 'x', enSuLugar: 'y' })).toMatch(/de lo que el Studio nunca permite/);
    expect(porQueNoSiempre(curl, regla, true, null)).toBeNull();
    expect(porQueNoSiempre(curl, { regla: null, que: 'x', riesgo: '' }, false, null)).toMatch(/no hay un solo tipo de acción/);
  });
});

describe('lo que imprime el gancho PermissionRequest', () => {
  it('al dar el permiso, la forma que Claude Code lee (la de tools/probarPermisos.ts)', () => {
    expect(respuestaDelGancho({ permitir: true, guardar: null })).toEqual({ hookSpecificOutput: { hookEventName: 'PermissionRequest', decision: { behavior: 'allow' } } });
    const siempre = respuestaDelGancho({ permitir: true, guardar: { regla: 'Bash(curl:*)', proyecto: 'golf', alcance: 'proyecto' } });
    expect(siempre.hookSpecificOutput.decision).toEqual({ behavior: 'allow' });
  });

  it('al negar, un mensaje que le dice al director qué hacer: seguir sin ello, decirlo en su respuesta y que el permiso queda en el panel', () => {
    const dice = (d: Parameters<typeof respuestaDelGancho>[0]) => {
      const { decision } = respuestaDelGancho(d).hookSpecificOutput;
      expect(decision.behavior).toBe('deny');
      return 'message' in decision ? decision.message : '';
    };
    const e = nueva();
    const pendiente = e.pedir(curl, T0);
    e.vencer(T0 + ESPERA_PERMISO_MS);
    for (const d of [e.decisionDe(pendiente.id)!, { permitir: false, motivo: 'ausente' } as const, { permitir: false, motivo: 'no_autorizado' } as const]) {
      const m = dice(d);
      expect(m).toMatch(/Sigue con lo demás sin hacerlo y dilo en tu respuesta/);
      expect(m).toMatch(/pendiente en «Modelo y consumo» › «Permisos»/);
    }
    expect(dice({ permitir: false, motivo: 'sin_respuesta' })).toMatch(/2 minutos/);
    expect(dice({ permitir: false, motivo: 'ausente' })).toMatch(/primera pregunta/);
    // Lo que nunca: dice por qué y qué hacer en su lugar, no que quedará pendiente
    const subir = e.pedir(push, T0 + 200 * SEG).decision!;
    const m = dice(subir);
    expect(m).toMatch(/nunca permite esto/);
    expect(m).toMatch(/historia ya subida/);
    expect(m).toMatch(/hazlo tú en tu terminal/);
    expect(m).not.toMatch(/Permisos/);
    // Sin símbolos de código en lo que lee una persona
    expect(m).not.toMatch(/&&/);
  });

  it('la llamada que pide permiso sale de lo que Claude Code le da al gancho, y solo si es un PermissionRequest', () => {
    expect(solicitudDelGancho({ hook_event_name: 'PermissionRequest', permission_mode: 'default', tool_name: 'Bash', tool_input: { command: 'node -p process.version' }, permission_suggestions: [] })).toEqual({ herramienta: 'Bash', entrada: { command: 'node -p process.version' } });
    expect(solicitudDelGancho({ hook_event_name: 'PermissionRequest', tool_name: 'Monitor' })).toEqual({ herramienta: 'Monitor', entrada: {} });
    expect(solicitudDelGancho({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: {} })).toBeNull();
    expect(solicitudDelGancho({ hook_event_name: 'PermissionRequest' })).toBeNull();
    expect(solicitudDelGancho(null)).toBeNull();
  });
});

describe('el sonido del diálogo', () => {
  it('suena al abrirse y cada 30 segundos, como mucho 4 veces: a los 0, 30, 60 y 90 segundos', () => {
    expect(avisosDelSonido(T0)).toEqual([T0, T0 + 30 * SEG, T0 + 60 * SEG, T0 + 90 * SEG]);
  });

  it('nunca suena a los dos minutos ni después, ni más de MAX_AVISOS veces', () => {
    const todos = avisosDelSonido(T0);
    expect(todos).toHaveLength(MAX_AVISOS);
    expect(todos.every((t) => t < T0 + ESPERA_PERMISO_MS)).toBe(true);
  });

  it('en cuanto la persona toca el diálogo, no suena más', () => {
    expect(avisosDelSonido(T0, T0 + 45 * SEG)).toEqual([T0, T0 + 30 * SEG]);
    expect(avisosDelSonido(T0, T0 + 30 * SEG)).toEqual([T0]);
    expect(avisosDelSonido(T0, T0)).toEqual([]);
    expect(avisosDelSonido(T0, T0 + 119 * SEG)).toHaveLength(4);
    expect(avisosDelSonido(T0, null)).toHaveLength(4);
  });
});

describe('lo que se niega sin que la persona lo decida queda pendiente en el panel de permisos', () => {
  const cuando = '2026-10-26T10:00:00.000Z';
  const vencidos = () => {
    const e = nueva();
    e.pedir(curl, T0);
    e.pedir(gitLog, T0 + SEG);
    // Nadie responde: a los dos minutos se niegan, y la persona se da por ausente
    e.vencer(T0 + ESPERA_PERMISO_MS + 2 * SEG);
    return e.quedanParaElPanel();
  };

  it('cada pregunta sin respuesta deja una línea en el registro con la forma del aviso de Claude Code y la entrada de lo que intentó', () => {
    const lineas = lineasDeNegadosSinDecidir(vencidos());
    expect(lineas).toHaveLength(2);
    const ev = JSON.parse(lineas[0]);
    expect(ev).toMatchObject({ type: 'system', subtype: 'permission_denied', origen: 'studio', tool_name: 'Bash', tool_input: curl.entrada });
    // Una línea completa, con un salto antes por si el registro quedó a medias
    expect(lineas[0].startsWith('\n{')).toBe(true);
    expect(lineas[0].endsWith('}\n')).toBe(true);
    // Lo que la persona decidió (o lo que nunca) no queda pendiente: no se escribe
    const e = nueva();
    e.responder(e.pedir(curl, T0).id, 'no', T0 + SEG);
    e.pedir(push, T0 + 2 * SEG);
    expect(lineasDeNegadosSinDecidir(e.quedanParaElPanel())).toEqual([]);
  });

  it('el panel de permisos lo ve, con su regla general, aunque Claude Code no cuente en su resultado lo que negó el gancho', () => {
    const texto = lineasDeNegadosSinDecidir(vencidos()).join('');
    expect(negadosDe(texto)).toEqual([
      { herramienta: 'Bash', entrada: curl.entrada },
      { herramienta: 'Bash', entrada: gitLog.entrada },
    ]);
    const panel = permisosNegados([{ proyecto: 'golf', cuando, registro: 'golf-1.log', texto }], () => prohibidas, CASA);
    expect(panel.map((p) => p.regla).sort()).toEqual(['Bash(curl:*)', 'Bash(git log:*)']);
    expect(panel.every((p) => p.proyecto === 'golf' && !p.nunca)).toBe(true);
    // Si Claude Code también lo cuenta en su resultado, no se repite
    const resultado = JSON.stringify({ type: 'result', permission_denials: [{ tool_name: 'Bash', tool_input: curl.entrada }] });
    expect(negadosDe(`${texto}${resultado}\n`)).toHaveLength(2);
    // …y el registro filtrado que lee el panel (registrosDeNegados) conserva la línea: tiene lo que busca NEGACION
    expect(texto.split('\n').filter((l) => l.includes(NEGACION))).toHaveLength(2);
  });

  it('se ve también en vivo, con lo que intentó', () => {
    expect(negadosEnVivo(lineasDeNegadosSinDecidir(vencidos()).join(''))).toEqual(['Bash: curl -s http://localhost:5180/__estudio/voz/lista', 'Bash: git log --oneline -5']);
  });
});

// La guardia que lee la orden entera (decisión del titular del 26 de octubre de 2026, pieza de «Los permisos, al
// momento»): una cadena pasa sola si cada orden está permitida, y si no, pregunta solo por la que falta
describe('las órdenes encadenadas, con «Me pregunta en el Studio»', () => {
  const permitidas = ['Bash(cd:*)', 'Bash(git log:*)', 'Bash(npm test)', 'Read(//c/repos/golf/**)'];
  const conPermitidas = () => new EsperaDePermisos('golf', prohibidas, CASA, permitidas);
  const orden = (command: string): SolicitudDePermiso => ({ herramienta: 'Bash', entrada: { command } });

  it('saca de una cadena las órdenes que no tiene; una orden sola u otra herramienta no es cadena', () => {
    expect(ordenesQueFaltan(orden('cd C:/repos/golf && git log --oneline -5'), permitidas)).toEqual([]);
    expect(ordenesQueFaltan(orden('cd x ; npm test && curl -s http://y'), permitidas)).toEqual(['curl -s http://y']);
    expect(ordenesQueFaltan(orden('curl -s http://y'), permitidas)).toBeNull();
    expect(ordenesQueFaltan(orden('cd x && git log > a.txt'), permitidas)).toBeNull();
    expect(ordenesQueFaltan(lee, permitidas)).toBeNull();
    // «npm test» está permitida tal cual: «npm test -- x» no
    expect(ordenesQueFaltan(orden('cd x && npm test -- x'), permitidas)).toEqual(['npm test -- x']);
  });

  it('si cada orden está permitida, pasa sola, sin preguntar ni contar como la primera pregunta', () => {
    const e = conPermitidas();
    const p = e.pedir(orden('cd C:/repos/golf && git log --oneline -5'), T0);
    expect(p.decision).toEqual({ permitir: true, guardar: null, cadena: true });
    expect(e.pendientes()).toEqual([]);
    expect(queAnotarDeLaLlamada('Bash', true, p.decision).que).toMatch(/cada orden de la cadena ya la tenía permitida/);
    // Y la primera pregunta de verdad sigue siendo la siguiente: si no se responde, la persona no está
    const q = e.pedir(curl, T0 + SEG);
    e.vencer(T0 + SEG + ESPERA_PERMISO_MS);
    expect(e.decisionDe(q.id)).toMatchObject({ permitir: false, motivo: 'sin_respuesta' });
    expect(e.ausente).toBe(true);
  });

  it('si le falta una, pregunta solo por esa, y «Permitir siempre» ofrece la regla de esa orden', () => {
    const e = conPermitidas();
    const p = e.pedir(orden('cd x && curl -s http://y'), T0);
    expect(p.decision).toBeNull();
    expect(p.faltan).toEqual(['curl -s http://y']);
    expect(p.propuesta.regla).toBe('Bash(curl:*)');
    expect(p.puedeSiempre).toBe(true);
    expect(e.responder(p.id, 'siempre', T0 + SEG)?.decision).toEqual({ permitir: true, guardar: { regla: 'Bash(curl:*)', proyecto: 'golf', alcance: 'proyecto' } });
  });

  it('si le faltan varias, pregunta por todas juntas, sin «Permitir siempre»; y lo que nunca se sigue negando en la cadena', () => {
    const e = conPermitidas();
    const p = e.pedir(orden('cd x && curl -s http://y && wget http://z'), T0);
    expect(p.faltan).toEqual(['curl -s http://y', 'wget http://z']);
    expect(p.puedeSiempre).toBe(false);
    const forzado = e.pedir(orden('cd x && git log -1 && git push --force'), T0 + SEG);
    expect(forzado.decision).toMatchObject({ permitir: false, motivo: 'nunca' });
    expect(forzado.faltan).toBeUndefined();
  });

  it('sin ninguna orden permitida (o sin la lista), como antes: la cadena se pregunta entera', () => {
    expect(ordenesQueFaltan(orden('curl -s http://y && wget http://z'), permitidas)).toBeNull();
    const p = nueva().pedir(orden('cd x && git log -1'), T0);
    expect(p.decision).toBeNull();
    expect(p.faltan).toBeUndefined();
    expect(p.porQueNoSiempre).toMatch(/junta 2 órdenes/);
  });
});
