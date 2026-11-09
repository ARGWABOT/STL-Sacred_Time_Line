import { describe, expect, it } from 'vitest';
import { ESPERA_PERMISO_MS, type Decision, type SolicitudDePermiso } from './permisoAlMomento';
import { contestarAlGancho, decidirParaElGancho, PermisosEnEspera, SIN_REVISION_MENSAJE, type Reloj } from './permisosEnEspera';
import { NUNCA_SIEMPRE } from './permisosNegados';
import { negado, SIN_ESPERAS } from './revisor';

// Las preguntas de permiso de las revisiones en marcha, atadas al tiempo (pr_permisos_al_momento, pieza 3; pd_permiso_espera):
// el gancho espera hasta que la persona responde o vencen los dos minutos, y solo pregunta una revisión que el lanzador abrió
const CASA = String.raw`C:\Users\ana`;
const STUDIO = String.raw`C:\xampp\STL`;
const GOLF = String.raw`C:\repos\golf`;
const prohibidas = [...new Set([...SIN_ESPERAS, ...negado(GOLF, STUDIO), ...NUNCA_SIEMPRE])];
const SEG = 1000;
const curl: SolicitudDePermiso = { herramienta: 'Bash', entrada: { command: 'curl -s http://localhost:5180/__estudio/voz/lista' } };
const lee: SolicitudDePermiso = { herramienta: 'Read', entrada: { file_path: String.raw`D:\notas\idea.md` } };
const push: SolicitudDePermiso = { herramienta: 'Bash', entrada: { command: 'git push --force origin main' } };

/** Un reloj de prueba: el tiempo avanza solo cuando la prueba lo dice, y entonces corren los temporizadores vencidos. */
function relojDePrueba() {
  let t = 1_000_000;
  const temporizadores: { en: number; fn: () => void; vivo: boolean }[] = [];
  const reloj: Reloj = {
    ahora: () => t,
    esperar: (ms, fn) => {
      const x = { en: t + ms, fn, vivo: true };
      temporizadores.push(x);
      return () => {
        x.vivo = false;
      };
    },
  };
  return {
    reloj,
    avanzar(ms: number) {
      t += ms;
      for (const x of temporizadores.filter((x) => x.vivo && x.en <= t)) {
        x.vivo = false;
        x.fn();
      }
    },
    vivos: () => temporizadores.filter((x) => x.vivo).length,
  };
}

/** Lo que va cumpliendo una promesa, para mirarlo sin esperarla. */
function mirar(p: Promise<Decision>) {
  const visto: { decision: Decision | null } = { decision: null };
  p.then((d) => (visto.decision = d));
  return visto;
}

const microtareas = () => new Promise((r) => setTimeout(r, 0));

describe('permisosEnEspera: el gancho espera a la persona', () => {
  it('«Solo esta vez» deja pasar la llamada y apaga su temporizador', async () => {
    const { reloj, avanzar, vivos } = relojDePrueba();
    const espera = new PermisosEnEspera(reloj);
    espera.abrir('k1', 'golf', prohibidas, CASA);
    const visto = mirar(espera.pedir('k1', curl));
    const [p] = espera.pendientes();
    expect(p).toMatchObject({ clave: 'k1', proyecto: 'golf', solicitud: curl });
    avanzar(10 * SEG);
    expect(espera.responder('k1', p.id, 'una_vez')?.aplicada).toBe(true);
    await microtareas();
    expect(visto.decision).toEqual({ permitir: true, guardar: null });
    expect(vivos()).toBe(0);
    expect(espera.pendientes()).toEqual([]);
  });

  it('«Permitir siempre» trae la regla para guardar, solo para el proyecto que se revisa', async () => {
    const { reloj } = relojDePrueba();
    const espera = new PermisosEnEspera(reloj);
    espera.abrir('k1', 'golf', prohibidas, CASA);
    const visto = mirar(espera.pedir('k1', curl));
    espera.responder('k1', espera.pendientes()[0].id, 'siempre');
    await microtareas();
    expect(visto.decision).toMatchObject({ permitir: true, guardar: { proyecto: 'golf', alcance: 'proyecto' } });
  });

  it('sin respuesta en dos minutos se niega, y desde ahí la persona se da por ausente', async () => {
    const { reloj, avanzar } = relojDePrueba();
    const espera = new PermisosEnEspera(reloj);
    espera.abrir('k1', 'golf', prohibidas, CASA);
    const primera = mirar(espera.pedir('k1', curl));
    avanzar(ESPERA_PERMISO_MS - SEG);
    await microtareas();
    expect(primera.decision).toBeNull();
    avanzar(SEG);
    await microtareas();
    expect(primera.decision).toEqual({ permitir: false, motivo: 'sin_respuesta' });
    // La siguiente ya no pregunta: se niega al instante
    const segunda = mirar(espera.pedir('k1', lee));
    await microtareas();
    expect(segunda.decision).toEqual({ permitir: false, motivo: 'ausente' });
    expect(espera.pendientes()).toEqual([]);
  });

  it('la que esperaba junto a la primera sin respuesta se niega con ella, sin esperar sus propios dos minutos', async () => {
    const { reloj, avanzar } = relojDePrueba();
    const espera = new PermisosEnEspera(reloj);
    espera.abrir('k1', 'golf', prohibidas, CASA);
    const primera = mirar(espera.pedir('k1', curl));
    avanzar(30 * SEG);
    const segunda = mirar(espera.pedir('k1', lee));
    avanzar(ESPERA_PERMISO_MS - 30 * SEG);
    await microtareas();
    expect(primera.decision).toEqual({ permitir: false, motivo: 'sin_respuesta' });
    expect(segunda.decision).toEqual({ permitir: false, motivo: 'ausente' });
  });

  it('lo que nunca se niega sin preguntar y no aparece en el diálogo', async () => {
    const { reloj } = relojDePrueba();
    const espera = new PermisosEnEspera(reloj);
    espera.abrir('k1', 'golf', prohibidas, CASA);
    const visto = mirar(espera.pedir('k1', push));
    await microtareas();
    expect(visto.decision).toMatchObject({ permitir: false, motivo: 'nunca' });
    expect(espera.pendientes()).toEqual([]);
  });

  it('una clave que el lanzador no abrió no pregunta: el gancho niega con su porqué', async () => {
    const espera = new PermisosEnEspera(relojDePrueba().reloj);
    const entrada = { hook_event_name: 'PermissionRequest', tool_name: 'Bash', tool_input: { command: 'curl -s http://y' } };
    expect(await contestarAlGancho(espera, 'otra', entrada)).toEqual({
      hookSpecificOutput: { hookEventName: 'PermissionRequest', decision: { behavior: 'deny', message: SIN_REVISION_MENSAJE } },
    });
    expect(espera.pendientes()).toEqual([]);
    expect(espera.responder('otra', 'p1', 'una_vez')).toBeNull();
  });

  it('el gancho no contesta lo que no es un PermissionRequest', async () => {
    const espera = new PermisosEnEspera(relojDePrueba().reloj);
    espera.abrir('k1', 'golf', prohibidas, CASA);
    expect(await contestarAlGancho(espera, 'k1', { hook_event_name: 'PreToolUse', tool_name: 'Bash' })).toBeNull();
    expect(await contestarAlGancho(espera, 'k1', 'basura')).toBeNull();
  });

  it('el gancho imprime lo que la persona decidió', async () => {
    const espera = new PermisosEnEspera(relojDePrueba().reloj);
    espera.abrir('k1', 'golf', prohibidas, CASA);
    const respuesta = contestarAlGancho(espera, 'k1', { hook_event_name: 'PermissionRequest', tool_name: 'Read', tool_input: { file_path: String.raw`D:\notas\idea.md` } });
    espera.responder('k1', espera.pendientes()[0].id, 'no');
    const impreso = await respuesta;
    expect(impreso?.hookSpecificOutput.decision).toMatchObject({ behavior: 'deny' });
    expect(JSON.stringify(impreso)).toContain('no lo autorizó');
  });

  it('cerrar la revisión niega lo que esperaba, deja de preguntar y devuelve lo que va al panel', async () => {
    const { reloj, vivos } = relojDePrueba();
    const espera = new PermisosEnEspera(reloj);
    espera.abrir('k1', 'golf', prohibidas, CASA);
    const visto = mirar(espera.pedir('k1', curl));
    const alPanel = espera.cerrar('k1');
    await microtareas();
    expect(visto.decision).toEqual({ permitir: false, motivo: 'sin_respuesta' });
    expect(alPanel.map((p) => p.solicitud)).toEqual([curl]);
    expect(vivos()).toBe(0);
    expect(espera.abierta('k1')).toBe(false);
    expect(espera.cerrar('k1')).toEqual([]);
  });

  it('«Permitir todo en esta revisión» deja pasar esa llamada y las siguientes de la misma revisión, sin esperar, y sin ninguna regla para guardar', async () => {
    const { reloj, avanzar, vivos } = relojDePrueba();
    const espera = new PermisosEnEspera(reloj);
    espera.abrir('k1', 'golf', prohibidas, CASA);
    const primera = mirar(espera.pedir('k1', curl));
    avanzar(5 * SEG);
    expect(espera.responder('k1', espera.pendientes()[0].id, 'todo')?.aplicada).toBe(true);
    await microtareas();
    expect(primera.decision).toEqual({ permitir: true, guardar: null, todo: 'elegido' });
    expect(vivos()).toBe(0);
    // Las que vienen después de la misma revisión no esperan: la promesa se cumple en el mismo instante
    const siguientes = [lee, curl, { herramienta: 'Bash', entrada: { command: 'cd x && curl -s http://y' } }].map((s) => mirar(espera.pedir('k1', s)));
    await microtareas();
    for (const s of siguientes) expect(s.decision).toEqual({ permitir: true, guardar: null, todo: 'automatico' });
    expect(espera.pendientes()).toEqual([]);
    expect(vivos()).toBe(0);
    // Ni el paso del tiempo cambia nada: no hay temporizador que niegue lo que pasó solo
    avanzar(10 * ESPERA_PERMISO_MS);
    expect(espera.cerrar('k1')).toEqual([]);
  });

  it('lo que esperaba en el diálogo cuando se elige «Permitir todo» pasa con ella, y los ganchos que lo esperaban se enteran', async () => {
    const { reloj, vivos } = relojDePrueba();
    const espera = new PermisosEnEspera(reloj);
    espera.abrir('k1', 'golf', prohibidas, CASA);
    const a = mirar(espera.pedir('k1', curl));
    const b = mirar(espera.pedir('k1', lee));
    expect(espera.pendientes()).toHaveLength(2);
    espera.responder('k1', espera.pendientes()[1].id, 'todo');
    await microtareas();
    expect(b.decision).toEqual({ permitir: true, guardar: null, todo: 'elegido' });
    expect(a.decision).toEqual({ permitir: true, guardar: null, todo: 'automatico' });
    expect(espera.pendientes()).toEqual([]);
    expect(vivos()).toBe(0);
  });

  it('con «Permitir todo» encendido, lo que nunca se sigue negando al instante', async () => {
    const { reloj } = relojDePrueba();
    const espera = new PermisosEnEspera(reloj);
    espera.abrir('k1', 'golf', prohibidas, CASA);
    mirar(espera.pedir('k1', curl));
    espera.responder('k1', espera.pendientes()[0].id, 'todo');
    const subir = mirar(espera.pedir('k1', push));
    const mezcla = mirar(espera.pedir('k1', { herramienta: 'Bash', entrada: { command: 'cd x && git push --force origin main' } }));
    const llaves = mirar(espera.pedir('k1', { herramienta: 'Read', entrada: { file_path: String.raw`C:\Users\ana\.ssh\id_rsa` } }));
    await microtareas();
    for (const s of [subir, mezcla, llaves]) expect(s.decision).toMatchObject({ permitir: false, motivo: 'nunca' });
    expect(espera.pendientes()).toEqual([]);
    // El gancho imprime la negativa, con su porqué
    const impreso = await contestarAlGancho(espera, 'k1', { hook_event_name: 'PermissionRequest', tool_name: 'Bash', tool_input: push.entrada });
    expect(impreso?.hookSpecificOutput.decision).toMatchObject({ behavior: 'deny' });
    expect(JSON.stringify(impreso)).toContain('nunca');
  });

  it('otra revisión vuelve a preguntar: otro lanzamiento del mismo proyecto, otro proyecto, y la misma revisión ya cerrada', async () => {
    const { reloj } = relojDePrueba();
    const espera = new PermisosEnEspera(reloj);
    espera.abrir('k1', 'golf', prohibidas, CASA);
    mirar(espera.pedir('k1', curl));
    espera.responder('k1', espera.pendientes()[0].id, 'todo');
    // Las demás revisiones abiertas, aunque sea al mismo tiempo, no heredan nada
    espera.abrir('k2', 'golf', prohibidas, CASA);
    espera.abrir('k3', 'tesis', prohibidas, CASA);
    const k1 = mirar(espera.pedir('k1', lee));
    const k2 = mirar(espera.pedir('k2', lee));
    const k3 = mirar(espera.pedir('k3', lee));
    await microtareas();
    expect(k1.decision).toMatchObject({ permitir: true });
    expect(k2.decision).toBeNull();
    expect(k3.decision).toBeNull();
    expect(espera.pendientes().map((p) => p.clave).sort()).toEqual(['k2', 'k3']);
    // Al terminar la revisión se olvida: la misma clave, abierta de nuevo, no trae el botón encendido
    expect(espera.cerrar('k1')).toEqual([]);
    espera.abrir('k1', 'golf', prohibidas, CASA);
    const otraVez = mirar(espera.pedir('k1', lee));
    await microtareas();
    expect(otraVez.decision).toBeNull();
    expect(espera.pendientes().map((p) => p.clave)).toContain('k1');
  });

  it('el gancho dice que la llamada pasó por «Permitir todo», para que quede en la bitácora', async () => {
    const { reloj } = relojDePrueba();
    const espera = new PermisosEnEspera(reloj);
    espera.abrir('k1', 'golf', prohibidas, CASA);
    const entrada = (command: string) => ({ hook_event_name: 'PermissionRequest', tool_name: 'Bash', tool_input: { command } });
    const primera = decidirParaElGancho(espera, 'k1', entrada('curl -s http://y'));
    espera.responder('k1', espera.pendientes()[0].id, 'todo');
    expect((await primera)?.decision).toMatchObject({ permitir: true, todo: 'elegido' });
    const sola = await decidirParaElGancho(espera, 'k1', entrada('git log --oneline -5'));
    expect(sola?.decision).toEqual({ permitir: true, guardar: null, todo: 'automatico' });
    expect(sola?.respuesta).toEqual({ hookSpecificOutput: { hookEventName: 'PermissionRequest', decision: { behavior: 'allow' } } });
    // Una clave desconocida no da nada, y lo que no es un PermissionRequest no se contesta
    expect((await decidirParaElGancho(espera, 'otra', entrada('curl x')))?.decision).toBeNull();
    expect(await decidirParaElGancho(espera, 'k1', { hook_event_name: 'PreToolUse', tool_name: 'Bash' })).toBeNull();
    // contestarAlGancho sigue imprimiendo lo mismo
    expect(await contestarAlGancho(espera, 'k1', entrada('git status'))).toEqual({ hookSpecificOutput: { hookEventName: 'PermissionRequest', decision: { behavior: 'allow' } } });
  });

  it('cada revisión pregunta aparte: la ausencia en una no apaga la otra, y el diálogo las muestra en el orden en que se pidieron', async () => {
    const { reloj, avanzar } = relojDePrueba();
    const espera = new PermisosEnEspera(reloj);
    espera.abrir('k1', 'golf', prohibidas, CASA);
    mirar(espera.pedir('k1', curl));
    avanzar(ESPERA_PERMISO_MS);
    await microtareas();
    espera.abrir('k2', 'stl', prohibidas, CASA);
    avanzar(SEG);
    mirar(espera.pedir('k2', lee));
    avanzar(SEG);
    espera.abrir('k3', 'otro', prohibidas, CASA);
    mirar(espera.pedir('k3', curl));
    expect(espera.pendientes().map((p) => p.proyecto)).toEqual(['stl', 'otro']);
  });
});
