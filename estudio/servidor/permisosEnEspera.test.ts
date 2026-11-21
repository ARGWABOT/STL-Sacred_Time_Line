import { describe, expect, it } from 'vitest';
import { type Decision, type SolicitudDePermiso } from './permisoAlMomento';
import { contestarAlGancho, correrPorPausa, decidirParaElGancho, MIRAR_PAUSA_MS, PermisosEnEspera, SIN_REVISION_MENSAJE, soloAEsteComputador, type Reloj } from './permisosEnEspera';
import { NUNCA_SIEMPRE } from './permisosNegados';
import { negado, SIN_ESPERAS } from './revisor';

// Las preguntas de permiso de las revisiones en marcha (documento «One permission mode»): el gancho espera hasta que la
// persona responde o la revisión termina, sin límite de tiempo, y solo pregunta una revisión que el lanzador abrió
const CASA = String.raw`C:\Users\ana`;
const STUDIO = String.raw`C:\xampp\STL`;
const GOLF = String.raw`C:\repos\golf`;
const prohibidas = [...new Set([...SIN_ESPERAS, ...negado(GOLF, STUDIO), ...NUNCA_SIEMPRE])];
const SEG = 1000;
const HORA = 60 * 60_000;
// A otro servidor: lo que va solo a este computador ya no pregunta (nmwpkiddptit, abajo)
const curl: SolicitudDePermiso = { herramienta: 'Bash', entrada: { command: 'curl -s -d x=1 https://example.com/voz/lista' } };
const orden = (command: string): SolicitudDePermiso => ({ herramienta: 'Bash', entrada: { command } });
const lee: SolicitudDePermiso = { herramienta: 'Read', entrada: { file_path: String.raw`D:\notas\idea.md` } };
const push: SolicitudDePermiso = { herramienta: 'Bash', entrada: { command: 'git push --force origin main' } };

/** Un reloj de prueba: el tiempo avanza solo cuando la prueba lo dice. */
function relojDePrueba() {
  let t = 1_000_000;
  const reloj: Reloj = { ahora: () => t };
  return {
    reloj,
    avanzar(ms: number) {
      t += ms;
    },
  };
}

/** Lo que va cumpliendo una promesa, para mirarlo sin esperarla. */
function mirar(p: Promise<Decision>) {
  const visto: { decision: Decision | null } = { decision: null };
  p.then((d) => (visto.decision = d));
  return visto;
}

const microtareas = () => new Promise((r) => setTimeout(r, 0));

describe('lo que solo va a este computador pasa sin el aviso (nmwpkiddptit)', () => {
  it('curl o wget que mandan datos solo a localhost, 127.0.0.1 o ::1 pasan', () => {
    for (const c of [
      'curl -d x=1 http://localhost:5180/x',
      'curl -s -X POST -H "Content-Type: application/json" -d \'{"a":"b.c"}\' http://127.0.0.1:8090/api',
      'curl --data-urlencode texto=hola http://[::1]:5180/__estudio/director/accion',
      'curl -s -o salida.json -d @nota.json localhost:5180/x',
      'wget --post-data=a=1 http://localhost:5180/x',
    ]) expect(soloAEsteComputador(orden(c)), c).toBe(true);
  });

  it('a otro servidor, mezclado, encadenado o desviado, sigue preguntando', () => {
    for (const c of [
      'curl -d x=1 https://example.com',
      'curl -d x=1 http://localhost:5180/x https://example.com',
      'curl -d x=1 http://localhost:5180/x example.com',
      'curl -d x=1 http://localhost.example.com/x',
      'curl -d x=1 http://usuario:clave@localhost/x',
      'curl -d x=1 http://localhost:5180/x && curl -d y=2 https://example.com',
      'curl -d x=1 http://localhost:5180/x; git push',
      'curl -d x=1 http://localhost:5180/$(cat destino)',
      'curl -x http://proxy.example.com:3128 -d x=1 http://localhost/x',
      'curl -sxhttp://proxy.example.com -d x=1 http://localhost/x',
      'curl --resolve localhost:80:93.184.216.34 -d x=1 http://localhost/x',
      'curl -K opciones.txt http://localhost/x',
      'wget -i lista.txt http://localhost/x',
      'curl -d x=1',
      'git push origin main',
    ]) expect(soloAEsteComputador(orden(c)), c).toBe(false);
    expect(soloAEsteComputador({ herramienta: 'WebFetch', entrada: { url: 'http://localhost:5180/' } })).toBe(false);
  });

  it('en una revisión, curl -d a localhost se deja sin aviso; a internet o mezclado, espera a la persona', async () => {
    const espera = new PermisosEnEspera(relojDePrueba().reloj);
    espera.abrir('k1', 'golf', prohibidas, CASA);
    expect(await espera.pedir('k1', orden('curl -d x=1 http://localhost:5180/x'))).toEqual({ permitir: true, guardar: null });
    expect(espera.pendientes()).toEqual([]);
    expect(espera.pausa('k1')).toEqual({ ms: 0, enPausa: false });
    mirar(espera.pedir('k1', orden('curl -d x=1 https://example.com')));
    mirar(espera.pedir('k1', orden('curl -d x=1 http://localhost:5180/x https://example.com')));
    expect(espera.pendientes()).toHaveLength(2);
    // Sin una revisión abierta, ni lo local pasa: el gancho niega
    expect(await espera.pedir('otra', orden('curl -d x=1 http://localhost:5180/x'))).toMatchObject({ permitir: false });
  });
});

describe('permisosEnEspera: el gancho espera a la persona', () => {
  it('«Solo esta vez» deja pasar la llamada', async () => {
    const { reloj, avanzar } = relojDePrueba();
    const espera = new PermisosEnEspera(reloj);
    espera.abrir('k1', 'golf', prohibidas, CASA);
    const visto = mirar(espera.pedir('k1', curl));
    const [p] = espera.pendientes();
    expect(p).toMatchObject({ clave: 'k1', proyecto: 'golf', solicitud: curl });
    avanzar(10 * SEG);
    expect(espera.responder('k1', p.id, 'una_vez')?.aplicada).toBe(true);
    await microtareas();
    expect(visto.decision).toEqual({ permitir: true, guardar: null });
    expect(espera.pendientes()).toEqual([]);
  });

  it('«Siempre, en este proyecto» trae la regla para guardar, solo para el proyecto que se revisa', async () => {
    const espera = new PermisosEnEspera(relojDePrueba().reloj);
    espera.abrir('k1', 'golf', prohibidas, CASA);
    const visto = mirar(espera.pedir('k1', curl));
    espera.responder('k1', espera.pendientes()[0].id, 'siempre');
    await microtareas();
    expect(visto.decision).toMatchObject({ permitir: true, guardar: { regla: 'Bash(curl:*)', proyecto: 'golf', alcance: 'proyecto' } });
  });

  it('«Siempre, en todos los proyectos» trae la regla con alcance «todos»', async () => {
    const espera = new PermisosEnEspera(relojDePrueba().reloj);
    espera.abrir('k1', 'golf', prohibidas, CASA);
    const visto = mirar(espera.pedir('k1', curl));
    espera.responder('k1', espera.pendientes()[0].id, 'siempre_todos');
    await microtareas();
    expect(visto.decision).toMatchObject({ permitir: true, guardar: { regla: 'Bash(curl:*)', alcance: 'todos' } });
  });

  it('«No lo autorizo» niega con «no_autorizado»', async () => {
    const espera = new PermisosEnEspera(relojDePrueba().reloj);
    espera.abrir('k1', 'golf', prohibidas, CASA);
    const visto = mirar(espera.pedir('k1', curl));
    espera.responder('k1', espera.pendientes()[0].id, 'no');
    await microtareas();
    expect(visto.decision).toEqual({ permitir: false, motivo: 'no_autorizado' });
  });

  it('una pregunta sin respuesta sigue esperando por muchas horas que pasen: la promesa no se cumple ni se niega', async () => {
    const { reloj, avanzar } = relojDePrueba();
    const espera = new PermisosEnEspera(reloj);
    espera.abrir('k1', 'golf', prohibidas, CASA);
    const primera = mirar(espera.pedir('k1', curl));
    for (const horas of [1, 3, 12, 48]) {
      avanzar(horas * HORA);
      await microtareas();
      expect(primera.decision, `${horas} h`).toBeNull();
      expect(espera.pendientes()).toHaveLength(1);
    }
    // Lo que se pide después tampoco se niega por «ausente»: se pregunta
    const segunda = mirar(espera.pedir('k1', lee));
    await microtareas();
    expect(segunda.decision).toBeNull();
    expect(espera.pendientes()).toHaveLength(2);
    // Y cuando la persona responde, se cumple
    espera.responder('k1', espera.pendientes()[0].id, 'una_vez');
    await microtareas();
    expect(primera.decision).toEqual({ permitir: true, guardar: null });
    expect(segunda.decision).toBeNull();
  });

  it('lo que nunca se niega sin preguntar y no aparece en el diálogo', async () => {
    const espera = new PermisosEnEspera(relojDePrueba().reloj);
    espera.abrir('k1', 'golf', prohibidas, CASA);
    const visto = mirar(espera.pedir('k1', push));
    await microtareas();
    expect(visto.decision).toMatchObject({ permitir: false, motivo: 'nunca' });
    expect(espera.pendientes()).toEqual([]);
    expect(espera.pausa('k1')).toEqual({ ms: 0, enPausa: false });
  });

  it('una clave que el lanzador no abrió no pregunta: el gancho niega con su porqué', async () => {
    const espera = new PermisosEnEspera(relojDePrueba().reloj);
    const entrada = { hook_event_name: 'PermissionRequest', tool_name: 'Bash', tool_input: { command: 'curl -s http://y' } };
    expect(await contestarAlGancho(espera, 'otra', entrada)).toEqual({
      hookSpecificOutput: { hookEventName: 'PermissionRequest', decision: { behavior: 'deny', message: SIN_REVISION_MENSAJE } },
    });
    expect(SIN_REVISION_MENSAJE).toMatch(/^This review cannot ask in the Studio\./);
    expect(espera.pendientes()).toEqual([]);
    expect(espera.responder('otra', 'p1', 'una_vez')).toBeNull();
    expect(espera.pausa('otra')).toEqual({ ms: 0, enPausa: false });
  });

  it('el gancho no contesta lo que no es un PermissionRequest', async () => {
    const espera = new PermisosEnEspera(relojDePrueba().reloj);
    espera.abrir('k1', 'golf', prohibidas, CASA);
    expect(await contestarAlGancho(espera, 'k1', { hook_event_name: 'PreToolUse', tool_name: 'Bash' })).toBeNull();
    expect(await contestarAlGancho(espera, 'k1', 'basura')).toBeNull();
  });

  it('el gancho imprime lo que la persona decidió, en inglés para el modelo', async () => {
    const espera = new PermisosEnEspera(relojDePrueba().reloj);
    espera.abrir('k1', 'golf', prohibidas, CASA);
    const respuesta = contestarAlGancho(espera, 'k1', { hook_event_name: 'PermissionRequest', tool_name: 'Read', tool_input: { file_path: String.raw`D:\notas\idea.md` } });
    espera.responder('k1', espera.pendientes()[0].id, 'no');
    const impreso = await respuesta;
    expect(impreso?.hookSpecificOutput.decision).toMatchObject({ behavior: 'deny' });
    expect(JSON.stringify(impreso)).toContain('The person did not authorize it');
  });

  it('cerrar la revisión niega lo que esperaba con «sin_respuesta», deja de preguntar y devuelve lo que va al panel', async () => {
    const espera = new PermisosEnEspera(relojDePrueba().reloj);
    espera.abrir('k1', 'golf', prohibidas, CASA);
    const visto = mirar(espera.pedir('k1', curl));
    const alPanel = espera.cerrar('k1');
    await microtareas();
    expect(visto.decision).toEqual({ permitir: false, motivo: 'sin_respuesta' });
    expect(alPanel.map((p) => p.solicitud)).toEqual([curl]);
    expect(espera.abierta('k1')).toBe(false);
    expect(espera.cerrar('k1')).toEqual([]);
  });

  it('con lo que nunca negado al instante, el gancho imprime la negativa con su porqué', async () => {
    const espera = new PermisosEnEspera(relojDePrueba().reloj);
    espera.abrir('k1', 'golf', prohibidas, CASA);
    const impreso = await contestarAlGancho(espera, 'k1', { hook_event_name: 'PermissionRequest', tool_name: 'Bash', tool_input: push.entrada });
    expect(impreso?.hookSpecificOutput.decision).toMatchObject({ behavior: 'deny' });
    expect(JSON.stringify(impreso)).toContain('The Studio never allows this');
  });

  it('cada revisión pregunta aparte, y la respuesta de una no abre otra; el diálogo las muestra en el orden en que se pidieron', async () => {
    const { reloj, avanzar } = relojDePrueba();
    const espera = new PermisosEnEspera(reloj);
    espera.abrir('k1', 'golf', prohibidas, CASA);
    mirar(espera.pedir('k1', curl));
    avanzar(5 * HORA);
    espera.abrir('k2', 'stl', prohibidas, CASA);
    avanzar(SEG);
    mirar(espera.pedir('k2', lee));
    avanzar(SEG);
    espera.abrir('k3', 'otro', prohibidas, CASA);
    mirar(espera.pedir('k3', curl));
    expect(espera.pendientes().map((p) => p.proyecto)).toEqual(['golf', 'stl', 'otro']);
    espera.responder('k1', espera.pendientes()[0].id, 'siempre');
    expect(espera.pendientes().map((p) => p.proyecto)).toEqual(['stl', 'otro']);
    // Otro lanzamiento del mismo proyecto, abierto de nuevo, pregunta
    espera.cerrar('k1');
    espera.abrir('k1', 'golf', prohibidas, CASA);
    const otraVez = mirar(espera.pedir('k1', lee));
    await microtareas();
    expect(otraVez.decision).toBeNull();
  });

  it('el gancho dice la decisión que originó la respuesta, para la bitácora', async () => {
    const espera = new PermisosEnEspera(relojDePrueba().reloj);
    espera.abrir('k1', 'golf', prohibidas, CASA);
    const entrada = (command: string) => ({ hook_event_name: 'PermissionRequest', tool_name: 'Bash', tool_input: { command } });
    const primera = decidirParaElGancho(espera, 'k1', entrada('curl -s http://y'));
    espera.responder('k1', espera.pendientes()[0].id, 'una_vez');
    const hecha = await primera;
    expect(hecha?.decision).toEqual({ permitir: true, guardar: null });
    expect(hecha?.respuesta).toEqual({ hookSpecificOutput: { hookEventName: 'PermissionRequest', decision: { behavior: 'allow' } } });
    // Una clave desconocida no da nada, y lo que no es un PermissionRequest no se contesta
    expect((await decidirParaElGancho(espera, 'otra', entrada('curl x')))?.decision).toBeNull();
    expect(await decidirParaElGancho(espera, 'k1', { hook_event_name: 'PreToolUse', tool_name: 'Bash' })).toBeNull();
  });
});

describe('permisosEnEspera: la pausa de la revisión', () => {
  it('cuenta el tiempo mientras algo espera, con el reloj que se le pasó, y se detiene tras la última respuesta', async () => {
    const { reloj, avanzar } = relojDePrueba();
    const espera = new PermisosEnEspera(reloj);
    espera.abrir('k1', 'golf', prohibidas, CASA);
    expect(espera.pausa('k1')).toEqual({ ms: 0, enPausa: false });
    mirar(espera.pedir('k1', curl));
    avanzar(2 * HORA);
    expect(espera.pausa('k1')).toEqual({ ms: 2 * HORA, enPausa: true });
    // Una segunda pregunta que se solapa no duplica la cuenta
    mirar(espera.pedir('k1', lee));
    avanzar(30 * SEG);
    const [a, b] = espera.pendientes();
    espera.responder('k1', a.id, 'una_vez');
    expect(espera.pausa('k1').enPausa).toBe(true);
    avanzar(30 * SEG);
    espera.responder('k1', b.id, 'no');
    await microtareas();
    expect(espera.pausa('k1')).toEqual({ ms: 2 * HORA + 60 * SEG, enPausa: false });
    // Después de la última respuesta ya no cuenta
    avanzar(10 * HORA);
    expect(espera.pausa('k1')).toEqual({ ms: 2 * HORA + 60 * SEG, enPausa: false });
  });

  it('cerrar la revisión cierra la pausa', () => {
    const { reloj, avanzar } = relojDePrueba();
    const espera = new PermisosEnEspera(reloj);
    espera.abrir('k1', 'golf', prohibidas, CASA);
    mirar(espera.pedir('k1', curl));
    avanzar(90 * SEG);
    expect(espera.pausa('k1')).toEqual({ ms: 90 * SEG, enPausa: true });
    espera.cerrar('k1');
    // Cerrada la revisión, ya no hay a quién preguntar
    expect(espera.pausa('k1')).toEqual({ ms: 0, enPausa: false });
  });

  it('el reloj del límite de la revisión se corre por lo pausado (correrPorPausa)', () => {
    // Algo espera todavía: volver a mirar en MIRAR_PAUSA_MS, sin dar nada por contado
    expect(correrPorPausa({ ms: 50 * SEG, enPausa: true }, 0)).toEqual({ en: MIRAR_PAUSA_MS, contada: 0 });
    expect(correrPorPausa({ ms: 50 * SEG, enPausa: true }, 20 * SEG)).toEqual({ en: MIRAR_PAUSA_MS, contada: 20 * SEG });
    // Ya nada espera y hubo pausa sin contar: correr el reloj esa pausa, y darla por contada
    expect(correrPorPausa({ ms: 50 * SEG, enPausa: false }, 0)).toEqual({ en: 50 * SEG, contada: 50 * SEG });
    expect(correrPorPausa({ ms: 50 * SEG, enPausa: false }, 20 * SEG)).toEqual({ en: 30 * SEG, contada: 50 * SEG });
    // Nada nuevo: el reloj hace lo suyo
    expect(correrPorPausa({ ms: 50 * SEG, enPausa: false }, 50 * SEG)).toBeNull();
    expect(correrPorPausa({ ms: 0, enPausa: false }, 0)).toBeNull();
    expect(MIRAR_PAUSA_MS).toBeGreaterThan(0);
  });
});
