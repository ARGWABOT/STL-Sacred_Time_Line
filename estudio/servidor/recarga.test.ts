import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { activoEsElStudio, cederALaNueva, contenerRecargas, EVENTO_CEDER, EVENTO_CEDIO, EVENTO_RECARGA } from './recarga';
import { comoTerminaLaRevision } from '../src/trabajando';

// El 11 de noviembre de 2026 (nota nmwbk689ttit), el diagnóstico de IDG cerró y el Studio «se reinició solo»: el servidor
// no se reinició (su registro no dice nada desde la revisión anterior), fue la página, que se recargaba entera al cerrar
// cualquier revisión. Ahora solo se recarga si el servidor retiene algo, es decir, si el director cambió el Studio
const servidorFalso = () => {
  const enviados: unknown[] = [];
  const escuchas = new Map<string, () => void>();
  let reinicios = 0;
  const hot = {
    send: (...a: unknown[]) => void enviados.push(a[0]),
    on: (e: string, f: () => void) => void escuchas.set(e, f),
  };
  const server = {
    environments: { client: { hot } },
    restart: async () => void (reinicios += 1),
    ws: { clients: new Set([{}]) },
    httpServer: { on: () => undefined },
  };
  return { server, hot, enviados, escuchas, reinicios: () => reinicios };
};
const proyectos = [{ id: 'stl-studio', esElStudio: true }, { id: 'idg', esElStudio: false }];
const conElStudio = { activo: 'stl-studio', proyectos };
const conOtro = { activo: 'idg', proyectos };

describe('cerrar la revisión de otro proyecto no reinicia ni recarga el Studio', () => {
  afterEach(() => vi.useRealTimers());
  const raiz = mkdtempSync(join(tmpdir(), 'stl-recarga-'));

  it('sin archivos del Studio cambiados, nada se retiene: ni aviso de recarga, ni reinicio, y la página termina en su sitio', async () => {
    vi.useFakeTimers();
    const f = servidorFalso();
    let trabajando = true;
    const c = contenerRecargas(f.server as never, raiz, () => trabajando);
    // El director escribe solo en la memoria del otro proyecto (fuera de la carpeta del Studio): Vite no manda nada
    expect(c.retenida()).toBe(false);
    trabajando = false;
    await vi.advanceTimersByTimeAsync(10_000);
    expect(f.enviados).toEqual([]);
    expect(f.reinicios()).toBe(0);
    expect(comoTerminaLaRevision({ recargaRetenida: c.retenida() })).toBe('en_su_sitio');
  });

  it('si el director cambió el Studio, la recarga se retiene mientras trabaja y llega una sola vez al final', async () => {
    vi.useFakeTimers();
    const f = servidorFalso();
    let trabajando = true;
    const c = contenerRecargas(f.server as never, raiz, () => trabajando, () => true);
    f.hot.send({ type: 'full-reload' });
    expect(f.enviados).toEqual([]);
    expect(c.retenida()).toBe(true);
    expect(comoTerminaLaRevision({ recargaRetenida: c.retenida(), ...conElStudio })).toBe('recargar');
    trabajando = false;
    await vi.advanceTimersByTimeAsync(2_500);
    expect(f.enviados).toEqual([{ type: 'custom', event: EVENTO_RECARGA, data: { reinicio: false } }]);
    expect(c.retenida()).toBe(false);
    expect(f.reinicios()).toBe(0);
  });

  // pd_revisiones_simultaneas: con dos revisiones a la vez, cerrar una no reinicia el Studio mientras la otra corre
  it('un reinicio nunca corta la revisión de otro proyecto: espera a que cierren todas las que corren', async () => {
    vi.useFakeTimers();
    const dir = mkdtempSync(join(tmpdir(), 'stl-simultaneas-'));
    const rev = (proyecto: string, extra: Record<string, string> = {}) => ({ proyecto, quien: 'a', pedida: '2026-11-12T10:00:00.000Z', lanzada: '2026-11-12T10:00:05.000Z', ...extra });
    const escribir = (revisiones: Record<string, unknown>) => writeFileSync(join(dir, 'estudio.local.json'), JSON.stringify({ activo: 'stl-studio', repositorios: { 'stl-studio': dir, idg: '/idg' }, revisiones }));
    escribir({ 'stl-studio': rev('stl-studio'), idg: rev('idg') });
    const f = servidorFalso();
    contenerRecargas(f.server as never, dir, () => false, () => true);
    await f.server.restart();
    expect(f.reinicios()).toBe(0);
    // Cierra la del Studio; la de IDG sigue: nada se suelta
    escribir({ 'stl-studio': rev('stl-studio', { hecha: '2026-11-12T10:30:00.000Z' }), idg: rev('idg') });
    await vi.advanceTimersByTimeAsync(10_000);
    expect(f.enviados).toEqual([]);
    expect(f.reinicios()).toBe(0);
    // Cierra la de IDG: el reinicio retenido se avisa a la página, una vez
    escribir({ 'stl-studio': rev('stl-studio', { hecha: '2026-11-12T10:30:00.000Z' }), idg: rev('idg', { hecha: '2026-11-12T10:40:00.000Z' }) });
    await vi.advanceTimersByTimeAsync(2_500);
    expect(f.enviados).toEqual([{ type: 'custom', event: EVENTO_RECARGA, data: { reinicio: true } }]);
  });

  // Nota nmwpx2ai0tit (21 de noviembre de 2026): la revisión de STL Studio cerró con la de «app» aún corriendo; su recarga
  // quedó retenida hasta que cerró la de «app», diez minutos después, y la página se recargó en pleno trabajo
  it('una recarga sola (sin reinicio) llega al cerrar la revisión del Studio, aunque la de otro proyecto siga corriendo', async () => {
    vi.useFakeTimers();
    const dir = mkdtempSync(join(tmpdir(), 'stl-recarga-sola-'));
    const rev = (proyecto: string, extra: Record<string, string> = {}) => ({ proyecto, quien: 'a', pedida: '2026-11-21T04:00:00.000Z', lanzada: '2026-11-21T04:00:05.000Z', ...extra });
    const escribir = (revisiones: Record<string, unknown>) => writeFileSync(join(dir, 'estudio.local.json'), JSON.stringify({ activo: 'stl-studio', repositorios: { 'stl-studio': dir, app: '/app' }, revisiones }));
    escribir({ 'stl-studio': rev('stl-studio'), app: rev('app') });
    const f = servidorFalso();
    let corren: string[] = ['stl-studio', 'app'];
    const c = contenerRecargas(f.server as never, dir, () => corren, () => true);
    f.hot.send({ type: 'full-reload' });
    expect(f.enviados).toEqual([]);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(f.enviados).toEqual([]);
    // Cierra la del Studio y su director sale; la de «app» sigue: la recarga llega ya, una vez
    escribir({ 'stl-studio': rev('stl-studio', { hecha: '2026-11-21T04:26:21.000Z' }), app: rev('app') });
    corren = ['app'];
    await vi.advanceTimersByTimeAsync(2_500);
    expect(f.enviados).toEqual([{ type: 'custom', event: EVENTO_RECARGA, data: { reinicio: false } }]);
    expect(c.retenida()).toBe(true);
    // Al cerrar la de «app», no llega otra
    escribir({ 'stl-studio': rev('stl-studio', { hecha: '2026-11-21T04:26:21.000Z' }), app: rev('app', { hecha: '2026-11-21T04:36:24.000Z' }) });
    corren = [];
    await vi.advanceTimersByTimeAsync(10_000);
    expect(f.enviados).toHaveLength(1);
  });

  it('con una revisión solo pedida (aún sin lanzar ni empezar), un cambio del Studio tampoco recarga la página', async () => {
    vi.useFakeTimers();
    const dir = mkdtempSync(join(tmpdir(), 'stl-pedida-'));
    const escribir = (revision: Record<string, string>) => writeFileSync(join(dir, 'estudio.local.json'), JSON.stringify({ activo: 'stl-studio', repositorios: { 'stl-studio': dir }, revision: { proyecto: 'stl-studio', quien: 'a', pedida: '2026-11-11T10:00:00.000Z', ...revision } }));
    escribir({});
    const f = servidorFalso();
    const c = contenerRecargas(f.server as never, dir, () => false, () => true);
    f.hot.send({ type: 'full-reload' });
    expect(f.enviados).toEqual([]);
    expect(c.retenida()).toBe(true);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(f.enviados).toEqual([]);
    // Al cerrarse la revisión (hecha), la recarga retenida llega una sola vez
    escribir({ hecha: '2026-11-11T10:05:00.000Z' });
    await vi.advanceTimersByTimeAsync(2_500);
    expect(f.enviados).toEqual([{ type: 'custom', event: EVENTO_RECARGA, data: { reinicio: false } }]);
  });

  // Nota nmwdoij9etit (12 de noviembre de 2026): con el Studio activo, el director cambió la página y el Studio no se
  // recargó al cerrar. El servidor soltaba la recarga y la olvidaba en el mismo momento; la página, al recibir el aviso,
  // preguntaba por lo retenido, oía «nada» y terminaba en su sitio
  it('con el Studio activo, la recarga soltada al cerrar sigue diciéndose a la página hasta que se pide otra revisión', async () => {
    vi.useFakeTimers();
    const dir = mkdtempSync(join(tmpdir(), 'stl-soltada-'));
    const escribir = (revision: Record<string, string>) => writeFileSync(join(dir, 'estudio.local.json'), JSON.stringify({ activo: 'stl-studio', repositorios: { 'stl-studio': dir }, revision: { proyecto: 'stl-studio', quien: 'a', ...revision } }));
    escribir({ pedida: '2026-11-12T10:00:00.000Z', lanzada: '2026-11-12T10:00:01.000Z' });
    const f = servidorFalso();
    let trabajando = true;
    const c = contenerRecargas(f.server as never, dir, () => trabajando, () => true);
    f.hot.send({ type: 'update' });
    expect(f.enviados).toEqual([]);
    // Cierra y el director sale: el aviso llega una vez…
    escribir({ pedida: '2026-11-12T10:00:00.000Z', lanzada: '2026-11-12T10:00:01.000Z', hecha: '2026-11-12T10:40:00.000Z' });
    trabajando = false;
    await vi.advanceTimersByTimeAsync(2_500);
    expect(f.enviados).toEqual([{ type: 'custom', event: EVENTO_RECARGA, data: { reinicio: false } }]);
    // …y lo que la página pregunta enseguida todavía dice que hay que recargar
    expect(c.retenida()).toBe(true);
    expect(comoTerminaLaRevision({ recargaRetenida: c.retenida(), ...conElStudio })).toBe('recargar');
    await vi.advanceTimersByTimeAsync(10_000);
    expect(f.enviados).toHaveLength(1);
    // Otra revisión pedida ya no hereda esa recarga
    escribir({ pedida: '2026-11-12T11:00:00.000Z' });
    expect(c.retenida()).toBe(false);
  });

  it('con otro proyecto activo, ni la recarga ni el reinicio llegan a la página, aunque Vite los pida (nmwc99ql2tit)', async () => {
    vi.useFakeTimers();
    const f = servidorFalso();
    let trabajando = true;
    const c = contenerRecargas(f.server as never, raiz, () => trabajando, () => false);
    f.hot.send({ type: 'full-reload' });
    f.hot.send({ type: 'update' });
    await f.server.restart();
    expect(c.retenida()).toBe(false);
    trabajando = false;
    await vi.advanceTimersByTimeAsync(40_000);
    expect(f.enviados).toEqual([]);
    expect(f.reinicios()).toBe(0);
    expect(comoTerminaLaRevision({ recargaRetenida: c.retenida(), ...conOtro })).toBe('en_su_sitio');
    // Aunque la página creyera que algo quedó retenido, con otro activo termina en su sitio
    expect(comoTerminaLaRevision({ recargaRetenida: true, ...conOtro })).toBe('en_su_sitio');
  });

  // Nota del titular nmwmejhh0tit (pd_reinicio_al_volver): la revisión de STL Studio corre de fondo y la persona trabaja en
  // otro proyecto. Al cerrar, nada se reinicia allí; al volver a STL Studio con el selector, el reinicio llega primero, una vez
  it('una revisión del Studio que cierra con otro proyecto activo no recarga; al volver al Studio, el reinicio llega una vez', async () => {
    vi.useFakeTimers();
    const f = servidorFalso();
    let trabajando = true;
    let studio = false;
    const c = contenerRecargas(f.server as never, raiz, () => trabajando, () => studio);
    // El director cambia la página y el servidor del Studio mientras la persona está en otro proyecto
    f.hot.send({ type: 'full-reload' });
    await f.server.restart();
    trabajando = false;
    await vi.advanceTimersByTimeAsync(40_000);
    // Cerró: con el otro proyecto activo, nada llega ni se reinicia
    expect(f.enviados).toEqual([]);
    expect(f.reinicios()).toBe(0);
    expect(c.retenida()).toBe(false);
    // Vuelve a STL Studio con el selector: lo retenido se dice a la página (que se pone al día con la recarga)…
    studio = true;
    expect(c.retenida()).toBe(true);
    expect(comoTerminaLaRevision({ recargaRetenida: c.retenida(), ...conElStudio })).toBe('recargar');
    await vi.advanceTimersByTimeAsync(2_500);
    expect(f.enviados).toEqual([{ type: 'custom', event: EVENTO_RECARGA, data: { reinicio: true } }]);
    // …y con la página libre, el servidor se reinicia, una sola vez
    f.escuchas.get('estudio:libre-para-reiniciar')?.();
    await vi.advanceTimersByTimeAsync(40_000);
    expect(f.reinicios()).toBe(1);
    expect(f.enviados).toHaveLength(1);
  });

  it('con el Studio activo, el reinicio retenido llega al final, como antes: el aviso y, con la página libre, el reinicio', async () => {
    vi.useFakeTimers();
    const f = servidorFalso();
    let trabajando = true;
    const c = contenerRecargas(f.server as never, raiz, () => trabajando, () => true);
    await f.server.restart();
    expect(f.reinicios()).toBe(0);
    expect(c.retenida()).toBe(true);
    trabajando = false;
    await vi.advanceTimersByTimeAsync(2_500);
    expect(f.enviados).toEqual([{ type: 'custom', event: EVENTO_RECARGA, data: { reinicio: true } }]);
    f.escuchas.get('estudio:libre-para-reiniciar')?.();
    await vi.advanceTimersByTimeAsync(4_000);
    expect(f.reinicios()).toBe(1);
  });

  it('lo retenido con el Studio activo no se suelta si, al terminar, el activo ya es otro: espera a que vuelva (nmwmejhh0tit)', async () => {
    vi.useFakeTimers();
    const f = servidorFalso();
    let trabajando = true;
    let studio = true;
    const c = contenerRecargas(f.server as never, raiz, () => trabajando, () => studio);
    f.hot.send({ type: 'full-reload' });
    studio = false;
    expect(c.retenida()).toBe(false);
    trabajando = false;
    await vi.advanceTimersByTimeAsync(10_000);
    expect(f.enviados).toEqual([]);
    studio = true;
    await vi.advanceTimersByTimeAsync(2_500);
    expect(f.enviados).toEqual([{ type: 'custom', event: EVENTO_RECARGA, data: { reinicio: false } }]);
  });

  // Decisión nmwdi7rg6tit: lo que el servidor le manda a la página con otro proyecto activo deja rastro; lo de la persona (F5), no
  describe('el rastro de una recarga o un reinicio que llega a la página con otro proyecto activo', () => {
    it('una recarga completa que llega deja un rastro con su causa, y una ráfaga dentro de 60 s deja uno solo', async () => {
      vi.useFakeTimers();
      const f = servidorFalso();
      const rastros: unknown[] = [];
      contenerRecargas(f.server as never, raiz, () => false, () => false, (r) => void rastros.push(r));
      f.hot.send({ type: 'full-reload', path: '/src/app.ts' });
      f.hot.send({ type: 'full-reload', path: '/src/otro.ts' });
      expect(f.enviados).toHaveLength(2);
      expect(rastros).toEqual([{ tipo: 'recarga', causa: expect.stringContaining('/src/app.ts'), archivo: '/src/app.ts' }]);
      await vi.advanceTimersByTimeAsync(61_000);
      f.hot.send({ type: 'full-reload' });
      expect(rastros).toHaveLength(2);
      expect(rastros[1]).toMatchObject({ tipo: 'recarga', causa: 'Vite mandó una recarga completa' });
    });

    it('un reinicio hecho deja su rastro', async () => {
      const f = servidorFalso();
      const rastros: unknown[] = [];
      contenerRecargas(f.server as never, raiz, () => false, () => false, (r) => void rastros.push(r));
      await f.server.restart();
      expect(f.reinicios()).toBe(1);
      expect(rastros).toEqual([{ tipo: 'reinicio', causa: expect.any(String) }]);
    });

    it('si el rastro falla, la recarga y el reinicio siguen', async () => {
      const f = servidorFalso();
      contenerRecargas(f.server as never, raiz, () => false, () => false, () => { throw new Error('no se pudo'); });
      f.hot.send({ type: 'full-reload' });
      await f.server.restart();
      expect(f.enviados).toHaveLength(1);
      expect(f.reinicios()).toBe(1);
    });

    it('nada con el Studio activo, con el director trabajando, con un update ni con una página que solo se conecta (F5)', async () => {
      vi.useFakeTimers();
      const rastros: unknown[] = [];
      const poner = (r: unknown) => void rastros.push(r);
      // El Studio activo: la recarga y el reinicio llegan, pero no son de otro proyecto
      const a = servidorFalso();
      contenerRecargas(a.server as never, raiz, () => false, () => true, poner);
      a.hot.send({ type: 'full-reload' });
      await a.server.restart();
      // Con el director trabajando, nada llega a la página
      const b = servidorFalso();
      contenerRecargas(b.server as never, raiz, () => true, () => false, poner);
      b.hot.send({ type: 'full-reload' });
      await b.server.restart();
      // Un update no recarga la página; y una página que se conecta no hace que el servidor mande nada
      const c = servidorFalso();
      contenerRecargas(c.server as never, raiz, () => false, () => false, poner);
      c.hot.send({ type: 'update' });
      c.escuchas.get('vite:client:connect')?.();
      await vi.advanceTimersByTimeAsync(10_000);
      expect(rastros).toEqual([]);
    });

    it('api.ts lo escribe en la bitácora y en el Buzón del activo como una nota de falla', () => {
      const api = readFileSync(join(__dirname, 'api.ts'), 'utf-8');
      expect(api).toContain("tipoNota: 'falla'");
      expect(api).toContain("t('servidor.recarga.nota'");
    });
  });

  it('sin decir cuál, el activo se lee de estudio.local.json: el Studio solo si su repositorio es esta carpeta', () => {
    const otra = mkdtempSync(join(tmpdir(), 'stl-activo-'));
    writeFileSync(join(otra, 'estudio.local.json'), JSON.stringify({ activo: 'idg', repositorios: { idg: join(tmpdir(), 'idg'), 'stl-studio': otra } }));
    expect(activoEsElStudio(otra)).toBe(false);
    const studio = mkdtempSync(join(tmpdir(), 'stl-activo-'));
    writeFileSync(join(studio, 'estudio.local.json'), JSON.stringify({ activo: 'stl-studio', repositorios: { 'stl-studio': studio } }));
    expect(activoEsElStudio(studio)).toBe(true);
    // El servidor de verdad lo pregunta así: la llamada de api.ts no le pasa otra respuesta
    const api = readFileSync(join(__dirname, 'api.ts'), 'utf-8');
    expect(api).toContain('contencion = contenerRecargas(server, raiz, () => revisor?.estado().revisandoEn ?? [], undefined, rastroDeRecarga);');
  });

  it('la página pregunta por lo retenido: el servidor lo da con los datos y la página decide con eso', () => {
    const api = readFileSync(join(__dirname, 'api.ts'), 'utf-8');
    expect(api).toContain('recargaRetenida: contencion?.retenida() ?? false');
    const app = readFileSync(join(__dirname, '..', 'src', 'app.ts'), 'utf-8');
    expect(app).toContain("comoTerminaLaRevision(nuevo) === 'en_su_sitio'");
  });
});

// El 3 de noviembre de 2026, tres doble clic con el Studio encendido no abrieron pestaña: el servidor contaba «2 páginas
// abiertas» que no se veían, y el lanzador solo abría una si contaba cero
type Escucha = (datos: unknown, pagina: Pagina) => void;
interface Pagina { socket: object; recibio: string[]; send(evento: string): void }
const pagina = (): Pagina => {
  const p: Pagina = { socket: {}, recibio: [], send: (e) => void p.recibio.push(e) };
  return p;
};
const canal = (abiertas: Pagina[]) => {
  const escuchas = new Set<Escucha>();
  return {
    // Como Vite: cada vez un conjunto nuevo, con las mismas páginas
    get clients() { return new Set(abiertas); },
    on: (_: string, f: Escucha) => void escuchas.add(f),
    off: (_: string, f: Escucha) => void escuchas.delete(f),
    conectar(p: Pagina) {
      abiertas.push(p);
      for (const f of [...escuchas]) f(undefined, p);
    },
    escuchas,
  };
};

describe('abrir el Studio otra vez deja una pestaña nueva al frente, y las que había le ceden el lugar', () => {
  it('las que ya estaban ceden solo cuando la nueva se conecta, y una sola vez', () => {
    const [a, b] = [pagina(), pagina()];
    const c = canal([a, b]);
    expect(cederALaNueva(c)).toBe(2);
    // La misma página que se reconecta (por ejemplo, se recargó) no es la nueva: nada se toca todavía
    c.conectar({ ...a, recibio: [] });
    expect([a.recibio, b.recibio]).toEqual([[], []]);
    const nueva = pagina();
    c.conectar(nueva);
    expect([a.recibio, b.recibio, nueva.recibio]).toEqual([[EVENTO_CEDER], [EVENTO_CEDER], []]);
    expect(c.escuchas.size).toBe(0);
    c.conectar(pagina());
    expect(a.recibio).toEqual([EVENTO_CEDER]);
  });

  it('una que se cerró mientras tanto no recibe nada; sin páginas abiertas, nada que esperar', () => {
    const [a, b] = [pagina(), pagina()];
    const abiertas = [a, b];
    const c = canal(abiertas);
    cederALaNueva(c);
    abiertas.splice(abiertas.indexOf(b), 1);
    c.conectar(pagina());
    expect([a.recibio, b.recibio]).toEqual([[EVENTO_CEDER], []]);
    const vacio = canal([]);
    expect(cederALaNueva(vacio)).toBe(0);
    expect(vacio.escuchas.size).toBe(0);
  });

  it('si la nueva no llega (el navegador no se abrió), ninguna cede', async () => {
    const a = pagina();
    const c = canal([a]);
    cederALaNueva(c, 20);
    await new Promise((r) => setTimeout(r, 50));
    expect(c.escuchas.size).toBe(0);
    c.conectar(pagina());
    expect(a.recibio).toEqual([]);
  });

  it('el lanzador siempre abre la pestaña con el Studio encendido, salvo con --sin-abrir, y la página sabe ceder', () => {
    const encender = readFileSync(join(__dirname, '..', '..', 'tools', 'encender.ts'), 'utf-8');
    const yaEncendido = encender.slice(encender.indexOf("if (ya && queHacer === 'recargar')"), encender.indexOf("if (!existsSync(join(raiz, 'node_modules', 'vite'))"));
    expect(yaEncendido).toContain("const abrir = !arg('--sin-abrir');");
    expect(yaEncendido).toContain('if (abrir) abrirNavegador();');
    expect(yaEncendido).not.toContain('!abiertas) abrirNavegador');
    const app = readFileSync(join(__dirname, '..', 'src', 'app.ts'), 'utf-8');
    expect(app).toContain(`import.meta.hot?.on('${EVENTO_CEDER}'`);
    // Y cuenta lo que hizo (se cierra, queda cubierta o espera), para la bitácora
    expect(app).toContain(`import.meta.hot?.send('${EVENTO_CEDIO}'`);
  });
});
